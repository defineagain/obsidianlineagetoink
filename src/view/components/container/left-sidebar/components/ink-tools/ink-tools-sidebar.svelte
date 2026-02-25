<script lang="ts">
    import { getView } from 'src/view/components/container/context';
    import { contentStore } from 'src/stores/document/derived/content-store';
    import { debounce } from 'obsidian';
    import { Info } from 'lucide-svelte';
    import { slide } from 'svelte/transition';
    import {
        validateNodeTopology,
        type ValidationResult,
    } from 'src/lib/ink-exporter/topology-validator';
    import {
        reformatBlock,
        type BlockType,
    } from 'src/lib/ink-exporter/block-formatter';
    import { TOPOLOGY_RULES_MD } from 'src/lib/ink-exporter/topology-rules-content';
    import { MarkdownRenderer } from 'obsidian';

    const view = getView();

    let activeNodeId: string | null = null;
    let nodeContent: string = '';

    const unsub = view.viewStore.subscribe((state) => {
        activeNodeId = state.document.activeNode;
        if (activeNodeId) {
            const docState = view.documentStore.getValue();
            nodeContent =
                docState.document.content[activeNodeId]?.content || '';
        } else {
            nodeContent = '';
        }
    });

    import { onDestroy } from 'svelte';
    onDestroy(() => {
        unsub();
    });

    function updateContent(newContent: string) {
        if (!activeNodeId) return;
        view.documentStore.dispatch({
            type: 'document/update-node-content',
            payload: {
                nodeId: activeNodeId,
                content: newContent,
            },
            context: { isInSidebar: true },
        });
    }

    function applyFormatting(targetType: BlockType) {
        if (!activeNodeId) return;
        const newContent = reformatBlock(nodeContent, targetType);
        updateContent(newContent);
    }

    let activeHelp: string | null = null;
    function toggleHelp(key: string) {
        activeHelp = activeHelp === key ? null : key;
    }

    const HELP_TEXT: Record<string, { title: string; desc: string }> = {
        knot: {
            title: 'Knot (===)',
            desc: 'The largest unit of content in Ink. Think of it as a Chapter or a major Scene.',
        },
        stitch: {
            title: 'Stitch (=)',
            desc: 'Sub-sections within a Knot. Use these to organize smaller branches or sequences.',
        },
        choice: {
            title: 'Choice (*)',
            desc: 'A standard branching path. Once selected by the player, it disappears.',
        },
        sticky: {
            title: 'Sticky Choice (+)',
            desc: 'A choice that persists even after being picked.',
        },
        gather: {
            title: 'Gather (-)',
            desc: 'Convergence points. Brings branching paths back together.',
        },
        divert: {
            title: 'Divert (->)',
            desc: 'A jump/link. Moves the story flow to another Knot or Stitch.',
        },
    };

    let showRules = false;
    const toggleRules = () => {
        showRules = !showRules;
    };

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

    let validationResult: ValidationResult | null = null;
    const runValidation = () => {
        if (!activeNodeId) return;
        const state = view.documentStore.getValue();
        const depth = state.document.columns.findIndex((c: any) =>
            c.groups.some((g: any) => g.nodes.includes(activeNodeId!)),
        );
        validationResult = validateNodeTopology(nodeContent, depth);
    };

    $: if (nodeContent) {
        validationResult = null;
    }
</script>

<div class="ink-tools-container">
    {#if activeNodeId}
        <div class="block-group">
            <div class="group-label">Topologies</div>
            <div class="button-grid">
                <div class="button-with-help">
                    <button
                        class="mod-cta"
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
                        class="mod-cta"
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

        <div class="preview-area">
            <div class="group-label">Card Content</div>
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
                        >Topology: {validationResult.type.toUpperCase()}</strong
                    >
                </div>
                <div class="val-message">{validationResult.message}</div>
            </div>
        {/if}

        <div class="footer-actions">
            <button class="mod-cta" on:mousedown|preventDefault={runValidation}>
                Parse & Check
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
            <p>Select a card to use Ink tools.</p>
        </div>
    {/if}
</div>

<style>
    .ink-tools-container {
        padding: 0 10px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow-y: auto;
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
        padding-top: 0.5rem;
        border-top: 1px solid var(--background-modifier-border);
    }

    .content-editor {
        width: 100%;
        min-height: 120px;
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
    }

    .footer-actions {
        padding-top: 0.5rem;
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
        max-height: 200px;
        overflow-y: auto;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        padding: 0.75rem;
        border-radius: var(--radius-s);
        font-size: 0.85em;
        line-height: 1.5;
    }

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
</style>
