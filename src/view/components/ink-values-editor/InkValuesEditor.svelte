<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import Lineage from 'src/main';
    import { LineageView } from 'src/view/view';
    import { getActiveLineageView } from 'src/obsidian/commands/helpers/get-active-lineage-view';
    import {
        parseGlobalVariables,
        parseInkLogicVariables,
        updateGlobalVariableInFM,
        addGlobalVariableToFM,
        updateVariableInInkLogic,
        addVariableToInkLogic,
        type InkVariable,
        type VariableType,
    } from 'src/lib/ink-exporter/variable-utils';
    import {
        Plus,
        RotateCcw,
        Trash2,
        ToggleLeft,
        ChevronUp,
        ChevronDown,
    } from 'lucide-svelte';
    import { slide } from 'svelte/transition';

    export let plugin: Lineage;
    export let view: any = null;

    let activeView: LineageView | null = null;
    let storeUnsubscribe: (() => void) | null = null;
    let pollingInterval: any = null;

    let globalVars: InkVariable[] = [];
    let isInkNative = false;
    let searchQuery = '';

    const unsubscribeStore = () => {
        if (storeUnsubscribe) {
            storeUnsubscribe();
            storeUnsubscribe = null;
        }
    };

    const updateActiveView = () => {
        const found = getActiveLineageView(plugin) || plugin.lastActiveView;
        if (!found) return;

        // Force a refresh even if view didn't change (e.g. returning to tab)
        activeView = found;
        refreshVariables();

        if (!storeUnsubscribe) {
            storeUnsubscribe = activeView.documentStore.subscribe(() => {
                refreshVariables();
            });
        }
    };

    function refreshVariables() {
        if (!activeView) return;
        const state = activeView.documentStore.getValue();

        // Sync with live story if available
        // Prioritize the provided view (sidebar context) over the global activeView
        let storyObj = view?.story || activeView.story;

        // Detect ink-native mode
        isInkNative = !!(state.file.inkLogic && state.file.inkLogic.trim());

        let parsedVars: InkVariable[] = [];
        if (isInkNative) {
            const parsed = parseInkLogicVariables(state.file.inkLogic);
            parsedVars = parsed.vars;
        } else {
            const parsed = parseGlobalVariables(state.file.frontmatter || '');
            parsedVars = parsed.vars;
        }

        if (storyObj && storyObj.variablesState) {
            globalVars = parsedVars.map((v) => {
                const liveVal = storyObj.variablesState[v.name];
                if (liveVal !== undefined) {
                    return { ...v, value: String(liveVal) };
                }
                return v;
            });
        } else {
            globalVars = parsedVars;
        }
    }

    $: filteredVars = globalVars.filter((v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    onMount(() => {
        updateActiveView();
        plugin.app.workspace.on('active-leaf-change', updateActiveView);

        // Poll for live variable updates from active story state
        pollingInterval = setInterval(() => {
            const storyObj = view?.story || activeView?.story;
            if (storyObj) {
                refreshVariables();
            }
        }, 500);
    });

    onDestroy(() => {
        unsubscribeStore();
        if (pollingInterval) clearInterval(pollingInterval);
        plugin.app.workspace.off('active-leaf-change', updateActiveView);
    });

    // ── Mutation Helpers ─────────────────────────────────────────────────────

    function updateVar(name: string, newValue: string) {
        if (!activeView) return;
        const state = activeView.documentStore.getValue();

        // Update live state if available
        const storyObj = view?.story || activeView.story;
        if (storyObj && storyObj.variablesState) {
            const liveVal = storyObj.variablesState[name];
            if (liveVal !== undefined) {
                if (isNumeric(newValue))
                    activeView.story.variablesState[name] =
                        parseFloat(newValue);
                else if (isBool(newValue))
                    activeView.story.variablesState[name] = newValue === 'true';
                else
                    activeView.story.variablesState[name] = newValue.replace(
                        /^"(.*)"$/,
                        '$1',
                    );
            }
        }

        if (isInkNative) {
            const updated = updateVariableInInkLogic(
                state.file.inkLogic,
                name,
                newValue,
            );
            activeView.documentStore.dispatch({
                type: 'document/file/update-ink-logic',
                payload: { inkLogic: updated },
            });
        } else {
            const updated = updateGlobalVariableInFM(
                state.file.frontmatter || '',
                name,
                newValue,
            );
            activeView.documentStore.dispatch({
                type: 'document/file/update-frontmatter',
                payload: { frontmatter: updated },
            });
        }
        refreshVariables();
    }

    function deleteVar(name: string) {
        if (!activeView) return;
        const state = activeView.documentStore.getValue();

        if (isInkNative) {
            // Remove the VAR/CONST line from inkLogic
            const regex = new RegExp(
                `^(?:VAR|CONST)\\s+${name}\\s*=.*$\\n?`,
                'm',
            );
            const updated = state.file.inkLogic.replace(regex, '');
            activeView.documentStore.dispatch({
                type: 'document/file/update-ink-logic',
                payload: { inkLogic: updated },
            });
        } else {
            // For legacy, rebuild without this var
            const parsed = parseGlobalVariables(state.file.frontmatter || '');
            const filtered = parsed.vars.filter((v) => v.name !== name);
            // Serialize manually
            const varLines = filtered
                .map((v) => `  ${v.type} ${v.name} = ${v.value}`)
                .join('\n');
            const funcBlock = parsed.funcs
                ? '\n' +
                  parsed.funcs
                      .split('\n')
                      .map((l) => `  ${l}`)
                      .join('\n')
                : '';
            const newLogicBlock = `story-logic: |\n${varLines}${funcBlock}`;
            const updated = (state.file.frontmatter || '').replace(
                /story-logic: \|[\s\S]+?(?=\n[a-z0-9-]+:|$)/,
                newLogicBlock,
            );
            activeView.documentStore.dispatch({
                type: 'document/file/update-frontmatter',
                payload: { frontmatter: updated },
            });
        }
        refreshVariables();
    }

    function incrementVar(name: string, amount: number) {
        const v = globalVars.find((x) => x.name === name);
        if (!v) return;
        const num = parseFloat(v.value);
        if (isNaN(num)) return;
        updateVar(name, String(num + amount));
    }

    function toggleVar(name: string) {
        const v = globalVars.find((x) => x.name === name);
        if (!v) return;
        if (v.value === 'true') updateVar(name, 'false');
        else if (v.value === 'false') updateVar(name, 'true');
    }

    function resetVar(name: string) {
        const v = globalVars.find((x) => x.name === name);
        if (!v) return;
        const num = parseFloat(v.value);
        if (!isNaN(num)) updateVar(name, '0');
        else if (v.value === 'true' || v.value === 'false')
            updateVar(name, 'false');
        else updateVar(name, '""');
    }

    function isNumeric(val: string): boolean {
        return !isNaN(parseFloat(val)) && isFinite(Number(val));
    }

    function isBool(val: string): boolean {
        return val === 'true' || val === 'false';
    }

    // ── Add Variable ─────────────────────────────────────────────────────────

    let showAddForm = false;
    let newVarName = '';
    let newVarType: VariableType = 'VAR';
    let newVarValue = '0';

    function addVariable() {
        if (!activeView || !newVarName.trim()) return;
        const state = activeView.documentStore.getValue();
        const safeName = newVarName.trim().replace(/\s+/g, '_');

        if (isInkNative) {
            const updated = addVariableToInkLogic(
                state.file.inkLogic,
                safeName,
                newVarType,
                newVarValue,
            );
            activeView.documentStore.dispatch({
                type: 'document/file/update-ink-logic',
                payload: { inkLogic: updated },
            });
        } else {
            const updated = addGlobalVariableToFM(
                state.file.frontmatter || '',
                safeName,
                newVarType,
                newVarValue,
            );
            activeView.documentStore.dispatch({
                type: 'document/file/update-frontmatter',
                payload: { frontmatter: updated },
            });
        }

        newVarName = '';
        newVarValue = '0';
        showAddForm = false;
        refreshVariables();
    }
</script>

<div class="ink-values-editor">
    <div class="values-header">
        <div class="header-left">
            <h4>Global Variables</h4>
            {#if activeView?.story}
                <span class="live-badge" title="Syncing with active game state"
                    >LIVE</span
                >
            {/if}
        </div>
        <span class="var-count">{globalVars.length}</span>
    </div>

    <div class="search-wrap">
        <input
            type="text"
            class="search-input"
            placeholder="Filter variables..."
            bind:value={searchQuery}
        />
        {#if searchQuery}
            <button class="clear-search" on:click={() => (searchQuery = '')}
                >✕</button
            >
        {/if}
    </div>

    {#if filteredVars.length > 0}
        <div class="var-list">
            {#each filteredVars as v (v.name)}
                <div class="var-row" transition:slide={{ duration: 150 }}>
                    <div class="var-info">
                        <span
                            class="var-type-badge"
                            class:is-const={v.type === 'CONST'}>{v.type}</span
                        >
                        <span class="var-name">{v.name}</span>
                    </div>
                    <div class="var-controls">
                        <input
                            type="text"
                            class="var-value-input"
                            value={v.value}
                            on:change={(e) =>
                                updateVar(v.name, e.currentTarget.value)}
                            on:click|stopPropagation
                            disabled={v.type === 'CONST'}
                        />
                        <div class="var-actions">
                            {#if isNumeric(v.value) && v.type !== 'CONST'}
                                <button
                                    class="action-btn"
                                    title="Increment +1"
                                    on:click={() => incrementVar(v.name, 1)}
                                    ><ChevronUp size={12} /></button
                                >
                                <button
                                    class="action-btn"
                                    title="Decrement -1"
                                    on:click={() => incrementVar(v.name, -1)}
                                    ><ChevronDown size={12} /></button
                                >
                            {/if}
                            {#if isBool(v.value) && v.type !== 'CONST'}
                                <button
                                    class="action-btn toggle-btn"
                                    class:is-on={v.value === 'true'}
                                    title="Toggle boolean"
                                    on:click={() => toggleVar(v.name)}
                                    ><ToggleLeft size={12} /></button
                                >
                            {/if}
                            {#if v.type !== 'CONST'}
                                <button
                                    class="action-btn"
                                    title="Reset to default"
                                    on:click={() => resetVar(v.name)}
                                    ><RotateCcw size={12} /></button
                                >
                                <button
                                    class="action-btn delete-btn"
                                    title="Delete variable"
                                    on:click={() => deleteVar(v.name)}
                                    ><Trash2 size={12} /></button
                                >
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="empty-state">
            No global variables declared in this file.
        </div>
    {/if}

    <div class="add-section">
        {#if showAddForm}
            <div class="add-form" transition:slide={{ duration: 200 }}>
                <div class="add-form-row">
                    <select bind:value={newVarType} class="type-select">
                        <option value="VAR">VAR</option>
                        <option value="CONST">CONST</option>
                    </select>
                    <input
                        type="text"
                        class="name-input"
                        bind:value={newVarName}
                        placeholder="variable_name"
                    />
                </div>
                <div class="add-form-row">
                    <input
                        type="text"
                        class="value-input"
                        bind:value={newVarValue}
                        placeholder="Initial value"
                    />
                    <button class="add-confirm-btn" on:click={addVariable}
                        >Add</button
                    >
                    <button
                        class="add-cancel-btn"
                        on:click={() => (showAddForm = false)}>✕</button
                    >
                </div>
            </div>
        {:else}
            <button class="add-var-btn" on:click={() => (showAddForm = true)}>
                <Plus size={14} />
                <span>Add Variable</span>
            </button>
        {/if}
    </div>
</div>

<style>
    .ink-values-editor {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .values-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .values-header h4 {
        margin: 0;
        font-size: 1em;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .live-badge {
        background: var(--color-red);
        color: white;
        font-size: 0.6em;
        font-weight: bold;
        padding: 1px 4px;
        border-radius: 3px;
        letter-spacing: 0.05em;
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0% {
            opacity: 0.8;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0.8;
        }
    }

    .search-wrap {
        position: relative;
        margin-bottom: 0.5rem;
    }

    .search-input {
        width: 100%;
        font-size: 0.8em;
        padding: 4px 24px 4px 8px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s);
    }

    .clear-search {
        position: absolute;
        right: 6px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0;
        font-size: 10px;
    }

    .var-count {
        background: var(--background-modifier-border);
        color: var(--text-muted);
        font-size: 0.75em;
        padding: 2px 8px;
        border-radius: 10px;
        font-weight: bold;
    }

    .var-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .var-row {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s);
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .var-info {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .var-type-badge {
        font-size: 0.65em;
        font-weight: bold;
        text-transform: uppercase;
        padding: 1px 5px;
        border-radius: 3px;
        background: var(--color-accent);
        color: var(--text-on-accent, #fff);
        flex-shrink: 0;
    }

    .var-type-badge.is-const {
        background: var(--text-faint);
    }

    .var-name {
        font-family: var(--font-monospace);
        font-size: 0.85em;
        color: var(--text-normal);
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .var-controls {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .var-value-input {
        flex: 1;
        font-family: var(--font-monospace);
        font-size: 0.8em;
        padding: 3px 6px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s);
        color: var(--text-normal);
        min-width: 0;
    }

    .var-value-input:focus {
        border-color: var(--color-accent);
        outline: none;
    }

    .var-value-input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .var-actions {
        display: flex;
        gap: 2px;
        flex-shrink: 0;
    }

    .action-btn {
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s);
        color: var(--text-muted);
        padding: 3px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        line-height: 1;
    }

    .action-btn:hover {
        color: var(--text-normal);
        background: var(--background-modifier-hover);
        border-color: var(--color-accent);
    }

    .toggle-btn.is-on {
        color: var(--color-accent);
        border-color: var(--color-accent);
    }

    .delete-btn:hover {
        color: var(--color-red, #e55);
        border-color: var(--color-red, #e55);
    }

    .empty-state {
        color: var(--text-muted);
        text-align: center;
        padding: 2rem 1rem;
        font-size: 0.85em;
    }

    .add-section {
        border-top: 1px solid var(--background-modifier-border);
        padding-top: 0.75rem;
    }

    .add-var-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px;
        font-size: 0.85em;
        background: var(--background-secondary);
        border: 1px dashed var(--background-modifier-border);
        border-radius: var(--radius-s);
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .add-var-btn:hover {
        background: var(--color-accent);
        color: var(--text-on-accent, #fff);
        border-style: solid;
        border-color: var(--color-accent);
    }

    .add-form {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .add-form-row {
        display: flex;
        gap: 4px;
    }

    .type-select {
        font-size: 0.8em;
        padding: 4px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s);
        color: var(--text-normal);
        flex-shrink: 0;
        width: 70px;
    }

    .name-input,
    .value-input {
        flex: 1;
        font-family: var(--font-monospace);
        font-size: 0.8em;
        padding: 4px 6px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s);
        color: var(--text-normal);
        min-width: 0;
    }

    .name-input:focus,
    .value-input:focus {
        border-color: var(--color-accent);
        outline: none;
    }

    .add-confirm-btn {
        padding: 4px 12px;
        font-size: 0.8em;
        background: var(--color-accent);
        color: var(--text-on-accent, #fff);
        border: none;
        border-radius: var(--radius-s);
        cursor: pointer;
        font-weight: bold;
        transition: opacity 0.15s ease;
    }

    .add-confirm-btn:hover {
        opacity: 0.85;
    }

    .add-cancel-btn {
        padding: 4px 8px;
        font-size: 0.8em;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s);
        color: var(--text-muted);
        cursor: pointer;
    }

    .add-cancel-btn:hover {
        color: var(--text-normal);
    }
</style>
