<script lang="ts">
    import { getView } from '../../../../../../context';
    import { contentStore } from '../../../../../../../../../stores/document/derived/content-store';
    import { debounce } from 'obsidian';

    export let nodeId: string;

    const view = getView();
    $: content = contentStore(view, nodeId);

    $: isKnot = ($content || '').startsWith('# ');
    $: isStitch = ($content || '').startsWith('## ');
    $: headerName = ($content || '').replace(/^#{1,2}\s+/, '').split('\n')[0];

    // Extract variable references like {variable_name} from card content
    $: variableRefs = (() => {
        const text = $content || '';
        const refs: string[] = [];
        const regex = /\{([a-zA-Z_]\w*(?:\s*[^}]*)?)\}/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const varName = match[1].split(':')[0].split('|')[0].trim();
            if (varName && !refs.includes(varName) && !varName.includes(' ')) {
                refs.push(varName);
            }
        }
        return refs;
    })();

    const updateHeader = debounce((newName: string) => {
        const prefix = isKnot ? '# ' : '## ';
        const lines = ($content || '').split('\n');
        lines[0] = prefix + newName.trim();
        const newContent = lines.join('\n');
        
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

{#if variableRefs.length > 0}
    <div class="ink-var-badges">
        {#each variableRefs as varRef}
            <span class="var-badge">{varRef}</span>
        {/each}
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
    .ink-var-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding: 3px 8px;
        background: var(--background-secondary);
        border-bottom: 1px solid var(--background-modifier-border);
    }
    .var-badge {
        display: inline-flex;
        align-items: center;
        font-size: 0.7em;
        font-family: var(--font-monospace);
        background: rgba(var(--color-accent-rgb, 71, 135, 235), 0.15);
        color: var(--color-accent);
        padding: 1px 6px;
        border-radius: 10px;
        border: 1px solid rgba(var(--color-accent-rgb, 71, 135, 235), 0.3);
    }
</style>
