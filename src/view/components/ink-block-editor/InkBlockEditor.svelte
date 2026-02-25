<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import Lineage from 'src/main';
    import { LineageView } from 'src/view/view';
    import { getActiveLineageView } from 'src/obsidian/commands/helpers/get-active-lineage-view';
    import { slugify } from 'src/helpers/slugify';
    import { Info } from 'lucide-svelte';
    import { slide } from 'svelte/transition';
    import { TopologyRulesModal } from '../../modals/topology-rules-modal/topology-rules-modal';
    import {
        validateNodeTopology,
        type ValidationResult,
    } from 'src/lib/ink-exporter/topology-validator';
    import { SelectParentModal } from '../../modals/select-parent-modal/select-parent-modal';
    import {
        reformatBlock,
        detectBlockType,
        type BlockType,
    } from 'src/lib/ink-exporter/block-formatter';
    import {
        extractLocalVariables,
        validateVariableRef,
        parseGlobalVariables,
        type VariableRef,
        type VariableValidationResult,
    } from 'src/lib/ink-exporter/variable-utils';
    import { TOPOLOGY_RULES_MD } from 'src/lib/ink-exporter/topology-rules-content';
    import { MarkdownRenderer } from 'obsidian';

    export let plugin: Lineage;
    export let view: any;

    let activeView: LineageView | null = null;
    let activeNodeId: string | null = null;
    let nodeContent: string = '';

    const unsubscribeViewStore = () => {
        if (viewStoreUnsubscribe) {
            viewStoreUnsubscribe();
            viewStoreUnsubscribe = null;
        }
    };

    let viewStoreUnsubscribe: (() => void) | null = null;

    const updateActiveView = () => {
        const view = getActiveLineageView(plugin) || plugin.lastActiveView;
        if (view !== activeView) {
            unsubscribeViewStore();
            activeView = view;
            if (activeView) {
                viewStoreUnsubscribe = activeView.viewStore.subscribe(
                    (state) => {
                        activeNodeId = state.document.activeNode;
                        if (activeNodeId) {
                            const docState =
                                activeView!.documentStore.getValue();
                            nodeContent =
                                docState.document.content[activeNodeId]
                                    ?.content || '';
                        } else {
                            nodeContent = '';
                        }
                    },
                );
            } else {
                activeNodeId = null;
                nodeContent = '';
            }
        }
    };

    onMount(() => {
        updateActiveView();
        plugin.app.workspace.on('active-leaf-change', updateActiveView);
    });

    onDestroy(() => {
        unsubscribeViewStore();
        plugin.app.workspace.off('active-leaf-change', updateActiveView);
    });

    function updateContent(newContent: string) {
        if (!activeView || !activeNodeId) return;
        activeView.documentStore.dispatch({
            type: 'document/update-node-content',
            payload: {
                nodeId: activeNodeId,
                content: newContent,
            },
            context: { isInSidebar: true },
        });
    }

    // Reactive taxonomy detection
    $: currentType = detectBlockType(nodeContent);

    $: validationResult = (() => {
        if (!activeView || !activeNodeId) return null;
        const state = activeView.documentStore.getValue();
        const depth = state.document.columns.findIndex((c) =>
            c.groups.some((g) => g.nodes.includes(activeNodeId!)),
        );
        return validateNodeTopology(nodeContent, depth);
    })();

    $: globals = (() => {
        if (!activeView) return [];
        const state = activeView.documentStore.getValue();
        const { vars } = parseGlobalVariables(state.file.frontmatter);
        // Clean names: remove "LIST " prefix for matching
        return vars.map(v => v.name.replace(/^LIST\s+/, ''));
    })();

    $: variableRefs = (() => {
        const refs = extractLocalVariables(nodeContent);
        return refs.map(ref => ({
            ...ref,
            validation: validateVariableRef(ref, globals)
        }));
    })();

    function applyFormatting(targetType: BlockType) {
        if (!activeNodeId) return;
        // Toggle: clicking the active type reverts to plain
        const effective = currentType === targetType ? 'plain' : targetType;
        const newContent = reformatBlock(nodeContent, effective);
        updateContent(newContent);
    }

    let activeHelp: string | null = null;
    function toggleHelp(key: string) {
        activeHelp = activeHelp === key ? null : key;
    }

    const HELP_TEXT: Record<string, { title: string; desc: string }> = {
        knot: {
            title: 'Knot (===)',
            desc: 'The largest unit of content in Ink. Think of it as a Chapter or a major Scene. Every card sequence should ideally start with a Knot.',
        },
        stitch: {
            title: 'Stitch (=)',
            desc: 'Sub-sections within a Knot. Use these to organize smaller branches or sequences inside a single scene.',
        },
        choice: {
            title: 'Choice (*)',
            desc: 'A standard branching path. Once selected by the player, it usually disappears from the list of options.',
        },
        sticky: {
            title: 'Sticky Choice (+)',
            desc: 'A choice that persists. It remains available even after the player has picked it once.',
        },
        gather: {
            title: 'Gather (-)',
            desc: 'Convergence points. Use these to bring multiple branching paths back together into a single flow.',
        },
        divert: {
            title: 'Divert (->)',
            desc: 'A jump or link. Use this to move the story flow from one card/branch to another specific Knot or Stitch.',
        },
    };

    let showRules = false;
    const toggleRules = () => {
        showRules = !showRules;
    };

    /** @type {HTMLElement} */
    let rulesContainer: HTMLElement;
    $: if (showRules && rulesContainer) {
        rulesContainer.empty();
        MarkdownRenderer.renderMarkdown(
            TOPOLOGY_RULES_MD,
            rulesContainer,
            '',
            null as any,
        );
    }

    const makeChildOf = () => {
        if (!activeView || !activeNodeId) return;
        new SelectParentModal(
            plugin.app,
            activeView,
            activeNodeId,
            (targetId) => {
                activeView!.documentStore.dispatch({
                    type: 'document/drop-node',
                    payload: {
                        droppedNodeId: activeNodeId!,
                        targetNodeId: targetId,
                        position: 'right',
                    },
                });
            },
        ).open();
    };
</script>

<div class="lineage-ink-block-editor">
    {#if activeNodeId}
        <div class="editor-header">
            <h4>Ink Block Editor</h4>
            <div class="editor-subtitle">
                Editing card for: {activeView?.getDisplayText() || 'Unknown'}
            </div>
        </div>

        <div class="block-group">
            <div class="group-label">Topologies</div>
            <div class="button-grid">
                <div class="button-with-help">
                    <button
                        class="topology-btn"
                        class:is-active={currentType === 'knot'}
                        on:mousedown|preventDefault={() =>
                            applyFormatting('knot')}
                        aria-label="Convert to Knot">Knot</button
                    >
                    <button
                        class="info-btn"
                        class:is-active={activeHelp === 'knot'}
                        on:mousedown|preventDefault={() => toggleHelp('knot')}
                    >
                        <Info size={14} />
                    </button>
                </div>
                <div class="button-with-help">
                    <button
                        class="topology-btn"
                        class:is-active={currentType === 'stitch'}
                        on:mousedown|preventDefault={() =>
                            applyFormatting('stitch')}
                        aria-label="Convert to Stitch">Stitch</button
                    >
                    <button
                        class="info-btn"
                        class:is-active={activeHelp === 'stitch'}
                        on:mousedown|preventDefault={() => toggleHelp('stitch')}
                    >
                        <Info size={14} />
                    </button>
                </div>
            </div>
        </div>

        <div class="block-group">
            <div class="group-label">Weave & Flow</div>
            <div class="button-grid">
                <div class="button-with-help">
                    <button
                        class="topology-btn"
                        class:is-active={currentType === 'choice'}
                        on:mousedown|preventDefault={() =>
                            applyFormatting('choice')}
                        aria-label="Single-use Choice">Choice</button
                    >
                    <button
                        class="info-btn"
                        class:is-active={activeHelp === 'choice'}
                        on:mousedown|preventDefault={() => toggleHelp('choice')}
                    >
                        <Info size={14} />
                    </button>
                </div>
                <div class="button-with-help">
                    <button
                        class="topology-btn"
                        class:is-active={currentType === 'sticky'}
                        on:mousedown|preventDefault={() =>
                            applyFormatting('sticky')}
                        aria-label="Sticky Choice">Sticky</button
                    >
                    <button
                        class="info-btn"
                        class:is-active={activeHelp === 'sticky'}
                        on:mousedown|preventDefault={() => toggleHelp('sticky')}
                    >
                        <Info size={14} />
                    </button>
                </div>
                <div class="button-with-help">
                    <button
                        class="topology-btn"
                        class:is-active={currentType === 'gather'}
                        on:mousedown|preventDefault={() =>
                            applyFormatting('gather')}
                        aria-label="Gather point">Gather</button
                    >
                    <button
                        class="info-btn"
                        class:is-active={activeHelp === 'gather'}
                        on:mousedown|preventDefault={() => toggleHelp('gather')}
                    >
                        <Info size={14} />
                    </button>
                </div>
                <div class="button-with-help">
                    <button
                        class="topology-btn"
                        class:is-active={currentType === 'divert'}
                        on:mousedown|preventDefault={() =>
                            applyFormatting('divert')}
                        aria-label="Divert to knot">Divert</button
                    >
                    <button
                        class="info-btn"
                        class:is-active={activeHelp === 'divert'}
                        on:mousedown|preventDefault={() => toggleHelp('divert')}
                    >
                        <Info size={14} />
                    </button>
                </div>
            </div>
        </div>

        {#if activeHelp}
            <div class="help-panel" transition:slide={{ duration: 200 }}>
                <div class="help-title">{HELP_TEXT[activeHelp].title}</div>
                <div class="help-desc">{HELP_TEXT[activeHelp].desc}</div>
            </div>
        {/if}

        {#if variableRefs.length > 0}
            <div class="variable-section">
                <div class="group-label">Variable Registry</div>
                <div class="variable-refs">
                    {#each variableRefs as ref}
                        <div 
                            class="variable-ref-row" 
                            class:val-warning={ref.validation.type === 'warning'} 
                            class:val-error={ref.validation.type === 'error'}
                            title={ref.validation.message}
                        >
                            <div class="var-badge-container">
                                <span class="var-badge">{ref.varName}</span>
                                {#if ref.validation.type !== 'success'}
                                    <span class="var-status-icon"
                                        >{ref.validation.type === 'error' ? '!' : '?'}</span
                                    >
                                {/if}
                            </div>
                            <input
                                type="text"
                                class="var-ref-input"
                                value={ref.expression}
                                on:change={(e) => {
                                    const newExpr = e.currentTarget.value;
                                    const updated = nodeContent.replace(
                                        ref.fullMatch,
                                        `{${newExpr}}`,
                                    );
                                    updateContent(updated);
                                }}
                                on:click|stopPropagation
                            />
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <div class="preview-area">
            <div class="group-label">Card Content Editor</div>
            <textarea
                class="content-editor"
                bind:value={nodeContent}
                on:input={() => updateContent(nodeContent)}
                placeholder="Type Ink content here..."
            ></textarea>
        </div>

        {#if validationResult}
            <div
                class="validation-panel"
                class:val-success={validationResult.type === 'success'}
                class:val-warning={validationResult.type === 'warning'}
                class:val-error={validationResult.type === 'error'}
                transition:slide
            >
                <div class="val-header">
                    <strong
                        >Topology Check: {validationResult.type.toUpperCase()}</strong
                    >
                    <span class="detected-type-tag">{validationResult.detectedType}</span>
                </div>
                <div class="val-message">{validationResult.message}</div>
            </div>
        {/if}

        <div class="footer-actions">
            <button on:mousedown|preventDefault={makeChildOf}>
                Make Child of...
            </button>
            <button
                class="rule-toggle-btn"
                class:is-active={showRules}
                on:mousedown|preventDefault={toggleRules}
            >
                {showRules ? 'Hide Rules' : 'Topology Rules'}
            </button>

            {#if showRules}
                <div
                    class="topology-rules-inline"
                    bind:this={rulesContainer}
                    transition:slide
                ></div>
            {/if}
        </div>
    {:else}
        <div class="empty-state">
            <p>Select a card in a Lineage view to assign Ink blocks.</p>
        </div>
    {/if}
</div>

<style>
    .lineage-ink-block-editor {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .editor-subtitle {
        font-size: 0.8em;
        color: var(--text-muted);
        margin-top: -1rem;
    }

    .block-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .group-label {
        font-size: 0.7em;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-faint);
        font-weight: bold;
    }

    .button-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
    }

    .button-grid button {
        width: 100%;
        font-size: 0.85em;
        justify-content: center;
        text-align: center;
    }

    .button-with-help {
        display: flex;
        gap: 2px;
        align-items: stretch;
    }

    .info-btn {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-faint);
        padding: 0 4px;
        border-radius: var(--radius-s);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        cursor: pointer;
    }

    .info-btn:hover {
        color: var(--text-normal);
        background: var(--background-modifier-hover);
    }

    .info-btn.is-active {
        color: var(--color-accent);
        border-color: var(--color-accent);
        background: var(--background-primary);
    }

    .help-panel {
        background: var(--background-secondary-alt);
        border-left: 3px solid var(--color-accent);
        padding: 0.75rem;
        border-radius: var(--radius-s);
        margin: 0.5rem 0;
        font-size: 0.85em;
    }

    .help-title {
        font-weight: bold;
        color: var(--text-normal);
        margin-bottom: 0.25rem;
    }

    .help-desc {
        color: var(--text-muted);
        line-height: 1.4;
    }

    .preview-area {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--background-modifier-border);
    }

    .content-editor {
        width: 100%;
        min-height: 150px;
        font-family: var(--font-monospace);
        font-size: 0.85em;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
        padding: 0.75rem;
        border-radius: var(--radius-s);
        resize: vertical;
        margin-top: 0.5rem;
    }

    .content-editor:focus {
        border-color: var(--color-accent);
        outline: none;
    }

    .validation-panel {
        padding: 0.75rem;
        border-radius: var(--radius-s);
        font-size: 0.85em;
        border: 1px solid transparent;
    }

    .val-success {
        background: rgba(var(--color-green-rgb), 0.1);
        border-color: var(--color-green);
        color: var(--color-green);
    }

    .val-warning {
        background: rgba(var(--color-orange-rgb), 0.1);
        border-color: var(--color-orange);
        color: var(--color-orange);
    }

    .val-error {
        background: rgba(var(--color-red-rgb), 0.1);
        border-color: var(--color-red);
        color: var(--color-red);
    }

    .val-header {
        margin-bottom: 0.25rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .detected-type-tag {
        font-size: 0.7em;
        text-transform: uppercase;
        background: rgba(var(--text-normal-rgb), 0.1);
        padding: 1px 6px;
        border-radius: 4px;
        font-family: var(--font-monospace);
    }

    .footer-actions {
        margin-top: auto;
        padding-top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border-top: 1px solid var(--background-modifier-border);
    }

    .footer-actions button {
        width: 100%;
        font-size: 0.8em;
    }

    .rule-toggle-btn {
        background: var(--background-secondary-alt);
        color: var(--text-muted);
    }

    .rule-toggle-btn.is-active {
        background: var(--color-accent);
        color: white;
    }

    .topology-rules-inline {
        max-height: 250px;
        overflow-y: auto;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        padding: 1rem;
        border-radius: var(--radius-s);
        font-size: 0.85em;
        line-height: 1.5;
    }

    /* Target headers inside the rendered markdown */
    .topology-rules-inline :global(h1),
    .topology-rules-inline :global(h2) {
        margin-top: 0;
        font-size: 1.1em;
        color: var(--text-normal);
    }

    .empty-state {
        color: var(--text-muted);
        text-align: center;
        margin-top: 2rem;
    }

    /* Taxonomy active state */
    .topology-btn {
        transition: all 0.15s ease;
    }

    .topology-btn.is-active {
        background: var(--color-accent);
        color: white;
        border-color: var(--color-accent);
        font-weight: bold;
    }

    /* Variable references */
    .variable-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .variable-refs {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .variable-ref-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 4px 8px;
        border-radius: var(--radius-s);
        transition: all 0.1s ease-in-out;
    }

    .variable-ref-row.val-warning {
        background: rgba(var(--color-orange-rgb), 0.1);
        border-left: 2px solid var(--color-orange);
    }

    .variable-ref-row.val-error {
        background: rgba(var(--color-red-rgb), 0.1);
        border-left: 2px solid var(--color-red);
    }

    .var-badge-container {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 80px;
    }

    .var-badge {
        display: inline-flex;
        align-items: center;
        font-size: 0.75em;
        font-family: var(--font-monospace);
        background: rgba(var(--color-accent-rgb, 71, 135, 235), 0.15);
        color: var(--color-accent);
        padding: 2px 8px;
        border-radius: 10px;
        border: 1px solid rgba(var(--color-accent-rgb, 71, 135, 235), 0.3);
        min-width: 80px;
        justify-content: center;
        white-space: nowrap;
    }

    .var-ref-input {
        flex: 1;
        font-family: var(--font-monospace);
        font-size: 0.8em;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
        padding: 3px 8px;
        border-radius: var(--radius-s);
    }

    .var-ref-input:focus {
        border-color: var(--color-accent);
        outline: none;
    }
</style>
