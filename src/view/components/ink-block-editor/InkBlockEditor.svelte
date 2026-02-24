<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import Lineage from 'src/main';
    import { LineageView } from 'src/view/view';
    import { getActiveLineageView } from 'src/obsidian/commands/helpers/get-active-lineage-view';
    import { slugify } from 'src/helpers/slugify';

    export let plugin: Lineage;
    export let view: any;

    let activeView: LineageView | null = null;
    let activeNodeId: string | null = null;
    let nodeContent: string = "";

    const unsubscribeViewStore = () => {
        if (viewStoreUnsubscribe) {
            viewStoreUnsubscribe();
            viewStoreUnsubscribe = null;
        }
    };

    let viewStoreUnsubscribe: (() => void) | null = null;

    const updateActiveView = () => {
        const view = getActiveLineageView(plugin);
        if (view !== activeView) {
            unsubscribeViewStore();
            activeView = view;
            if (activeView) {
                viewStoreUnsubscribe = activeView.viewStore.subscribe((state) => {
                    activeNodeId = state.document.activeNode;
                    if (activeNodeId) {
                        const docState = activeView!.documentStore.getValue();
                        nodeContent = docState.document.content[activeNodeId]?.content || "";
                    } else {
                        nodeContent = "";
                    }
                });
            } else {
                activeNodeId = null;
                nodeContent = "";
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
                content: newContent
            },
            context: { isInSidebar: true }
        });
    }

    function applyPrefix(prefix: string) {
        let trimmed = nodeContent.trimStart();
        // Remove existing markers if they match to allow swapping
        const markerRegex = /^(\*|\+|\-|->)\s*/;
        trimmed = trimmed.replace(markerRegex, '');
        updateContent(`${prefix} ${trimmed}`);
    }

    function applyKnot() {
        if (!nodeContent) return;
        const trimmed = nodeContent.trim();
        if (trimmed.startsWith('===')) return; // Already a knot
        
        const lines = nodeContent.split('\n');
        const firstLine = lines[0].trim() || 'knot';
        const name = slugify(firstLine);
        updateContent(`=== ${name} ===\n${nodeContent}`);
    }

    function applyStitch() {
        if (!nodeContent) return;
        const trimmed = nodeContent.trim();
        if (trimmed.startsWith('=')) return; // Already a stitch
        if (trimmed.startsWith('===')) return; // Knot is higher level
        
        const lines = nodeContent.split('\n');
        const firstLine = lines[0].trim() || 'stitch';
        const name = slugify(firstLine);
        updateContent(`= ${name}\n${nodeContent}`);
    }
    
    function applyGather() { applyPrefix('-'); }
    function applyChoice() { applyPrefix('*'); }
    function applyStickyChoice() { applyPrefix('+'); }
    function applyDivert() { applyPrefix('->'); }
</script>

<div class="lineage-ink-block-editor">
    {#if activeNodeId}
        <h4>Ink Block Editor</h4>
        <div class="editor-subtitle">Editing card for: {activeView?.getDisplayText() || 'Unknown'}</div>

        <div class="block-group">
            <div class="group-label">Topologies</div>
            <div class="button-grid">
                <button class="mod-cta" on:click={applyKnot} aria-label="Convert to Knot">Knot (===)</button>
                <button class="mod-cta" on:click={applyStitch} aria-label="Convert to Stitch">Stitch (=)</button>
            </div>
        </div>

        <div class="block-group">
            <div class="group-label">Weave & Flow</div>
            <div class="button-grid">
                <button on:click={applyChoice} aria-label="Single-use Choice">Choice (*)</button>
                <button on:click={applyStickyChoice} aria-label="Sticky Choice">Sticky (+)</button>
                <button on:click={applyGather} aria-label="Gather point">Gather (-)</button>
                <button on:click={applyDivert} aria-label="Divert to knot">Divert (->)</button>
            </div>
        </div>
        
        <div class="preview-area">
            <div class="group-label">Card Content Preview</div>
            <pre class="content-preview">{nodeContent || '(Empty)'}</pre>
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

    .preview-area {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--background-modifier-border);
    }

    .content-preview {
        font-family: var(--font-monospace);
        font-size: 0.8em;
        white-space: pre-wrap;
        background: var(--background-secondary);
        padding: 0.5rem;
        border-radius: var(--radius-s);
        max-height: 200px;
        overflow-y: auto;
        margin: 0.5rem 0;
    }

    .empty-state {
        color: var(--text-muted);
        text-align: center;
        margin-top: 2rem;
    }
</style>
