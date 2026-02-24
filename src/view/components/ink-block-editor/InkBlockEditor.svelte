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
        type BlockType,
    } from 'src/lib/ink-exporter/block-formatter';

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

    const showTopologyRules = async () => {
        const rulesPath = 'Storyflow/Ink Topology Rules.md';
        const rulesFile = plugin.app.vault.getAbstractFileByPath(rulesPath);
        let rulesMarkdown = '';
        if (rulesFile && 'read' in rulesFile) {
            rulesMarkdown = await plugin.app.vault.read(rulesFile as any);
        } else {
            // Fallback if the file isn't in the vault (e.g. during dev or if brain dir is hidden)
            rulesMarkdown = `# Ink-Lineage Authoring Rules\n\n(Rules file not found at ${rulesPath})`;
        }
        new TopologyRulesModal(plugin.app, rulesMarkdown).open();
    };

    let validationResult: ValidationResult | null = null;
    const runValidation = () => {
        if (!activeView || !activeNodeId) return;
        const state = activeView.documentStore.getValue();
        const depth = state.document.columns.findIndex((c) =>
            c.groups.some((g) => g.nodes.includes(activeNodeId!)),
        );
        validationResult = validateNodeTopology(nodeContent, depth);
    };

    $: if (nodeContent) {
        validationResult = null;
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
                </div>
                <div class="val-message">{validationResult.message}</div>
            </div>
        {/if}

        <div class="footer-actions">
            <button class="mod-cta" on:mousedown|preventDefault={runValidation}>
                Parse & Check
            </button>
            <button on:mousedown|preventDefault={makeChildOf}>
                Make Child of...
            </button>
            <button
                class="mod-ghost"
                on:mousedown|preventDefault={showTopologyRules}
            >
                Topology Rules
            </button>
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
    }

    .footer-actions {
        margin-top: auto;
        padding-top: 1rem;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        border-top: 1px solid var(--background-modifier-border);
    }

    .footer-actions button {
        font-size: 0.8em;
    }

    .footer-actions button.mod-ghost {
        grid-column: span 2;
    }

    .empty-state {
        color: var(--text-muted);
        text-align: center;
        margin-top: 2rem;
    }
</style>
