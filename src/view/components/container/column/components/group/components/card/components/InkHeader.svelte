<script lang="ts">
    import { getView } from '../../../../../../context';
    import { contentStore } from '../../../../../../../../../stores/document/derived/content-store';
    import { debounce } from 'obsidian';

    export let nodeId: string;

    const view = getView();
    $: content = contentStore(view, nodeId);

    $: isKnot = ($content || '').startsWith('# ');
    $: isStitch = ($content || '').startsWith('## ');
    $: headerName = ($content || '').replace(/^#{1,2}\s+/, '');

    const updateHeader = debounce((newName: string) => {
        const prefix = isKnot ? '# ' : '## ';
        const newContent = prefix + newName.trim();
        
        view.documentStore.dispatch({
            type: 'document/update-node-content',
            payload: {
                nodeId,
                content: newContent
            },
            context: {
                isInSidebar: false
            }
        });
    }, 500);

</script>

{#if isKnot || isStitch}
    <div class="ink-header {isKnot ? 'knot' : 'stitch'}">
        <span class="header-label">{isKnot ? 'KNOT' : 'STITCH'}</span>
        <input 
            type="text" 
            class="header-input" 
            bind:value={headerName} 
            on:input={(e) => updateHeader(e.currentTarget.value)}
            on:click|stopPropagation
        />
    </div>
{/if}

<style>
    .ink-header {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--background-secondary);
        padding: 4px 8px;
        border-bottom: 1px solid var(--background-modifier-border);
        font-size: 0.8em;
    }
    .knot {
        border-left: 4px solid var(--color-accent);
    }
    .stitch {
        border-left: 4px solid var(--color-cyan);
    }
    .header-label {
        font-weight: bold;
        color: var(--text-muted);
        min-width: 50px;
    }
    .header-input {
        background: transparent;
        border: none;
        color: var(--text-normal);
        font-family: var(--font-monospace);
        width: 100%;
        padding: 0;
    }
</style>
