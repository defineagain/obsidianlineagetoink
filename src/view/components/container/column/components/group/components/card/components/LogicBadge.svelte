<script lang="ts">
    import { getView } from 'src/view/components/container/context';
    import { contentStore } from 'src/stores/document/derived/content-store';

    export let nodeId: string;

    const view = getView();
    // Reactive store subscription
    $: content = contentStore(view, nodeId);
    
    // Extract Logic expressions: e.g. { health > 50 : }
    // Or ~ temp var = 1
    $: logicBlocks = extractLogic($content || '');

    function extractLogic(text: string) {
        const results = [];
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('~')) {
                results.push(trimmed);
            }
            
            // Match inline conditionals { condition: result }
            // or { condition }
            const conditionMatch = trimmed.match(/\{[^}]+\}/g);
            if (conditionMatch) {
                for(const m of conditionMatch) {
                    if(m.includes(':') || m.match(/\{[A-Za-z0-9_]+\}/)) {
                        results.push(m);
                    }
                }
            }
        }
        return results.slice(0, 3); // max 3 to prevent UI clutter
    }
</script>

{#if logicBlocks.length > 0}
    <div class="lineage-ink-logic-badge">
        {#each logicBlocks as block}
            <span class="logic-snippet" title={block}>{block}</span>
        {/each}
    </div>
{/if}

<style>
    .lineage-ink-logic-badge {
        position: absolute;
        top: -8px;
        left: 20px;
        display: flex;
        gap: 4px;
        z-index: 5;
        max-width: 80%;
        overflow: hidden;
    }
    
    .logic-snippet {
        background-color: var(--color-accent);
        color: var(--text-on-accent);
        font-family: var(--font-monospace);
        font-size: 10px;
        padding: 2px 6px;
        border-radius: var(--radius-s);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
</style>
