<script lang="ts">
    import { onMount } from 'svelte';
    import { MarkdownRenderer, App } from 'obsidian';

    export let app: App;
    export let rulesMarkdown: string;

    let container: HTMLElement;

    onMount(async () => {
        if (container) {
            await MarkdownRenderer.renderMarkdown(
                rulesMarkdown,
                container,
                '',
                null as any,
            );
        }
    });
</script>

<div class="topology-rules-container" bind:this={container}>
    <!-- Markdown content will be rendered here -->
</div>

<style>
    .topology-rules-container {
        padding: 1rem;
        user-select: text;
    }

    :global(.topology-rules-container h1) {
        margin-top: 0;
    }
</style>
