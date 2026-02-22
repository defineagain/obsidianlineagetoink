<script lang="ts">
    import { getView } from 'src/view/components/container/context';
    import { contentStore } from 'src/stores/document/derived/content-store';

    export let nodeId: string;
    export let isInSidebar: boolean = false;

    const view = getView();
    $: content = contentStore(view, nodeId);

    // Check if it's a sticky choice
    $: isSticky = ($content || '').trim().startsWith('+');

    function toggleChoiceType(e: MouseEvent) {
        e.stopPropagation();
        const currentContent = $content || '';
        let newContent = currentContent;

        if (isSticky) {
            // Remove first '+'
            newContent = currentContent.replace(/^\s*\+\s*/, '');
        } else {
            // Add '+'
            newContent = '+ ' + currentContent.replace(/^\s*\*\s*/, '');
        }

        view.documentStore.dispatch({
            type: 'document/update-node-content',
            payload: {
                nodeId,
                content: newContent,
            },
            context: {
                isInSidebar,
            },
        });
    }
</script>

<button
    class={`lineage-ink-choice-toggle ${isSticky ? 'sticky' : 'normal'}`}
    on:click={toggleChoiceType}
    aria-label="Toggle Choice Type (Normal vs Sticky)"
>
    {isSticky ? '+' : '*'}
</button>

<style>
    .lineage-ink-choice-toggle {
        position: absolute;
        top: -8px;
        left: 2px;
        width: 16px;
        height: 16px;
        z-index: 5;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-monospace);
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        padding: 0;
        border: none;
    }

    .normal {
        background-color: var(--color-base-40);
        color: var(--text-normal);
    }

    .sticky {
        background-color: var(--color-red);
        color: var(--text-on-accent);
    }

    .lineage-ink-choice-toggle:hover {
        transform: scale(1.1);
        filter: brightness(1.2);
    }
</style>
