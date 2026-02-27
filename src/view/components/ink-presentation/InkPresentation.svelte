<script lang="ts">
    import { onMount, onDestroy, afterUpdate } from 'svelte';
    import { TFile } from 'obsidian';
    import Lineage from 'src/main';
    // @ts-ignore
    import { Compiler, Story } from 'inkjs/full';
    import { extractInkBlock } from 'src/lib/ink-block/ink-block-utils';
    import { astToInk } from 'src/lib/ink-exporter/ast-parser';
    import { htmlCommentToJson } from 'src/lib/data-conversion/x-to-json/html-comment-to-json';
    import { fade, slide } from 'svelte/transition';

    export let plugin: Lineage;
    export let view: any;

    type DisplayItem = {
        type: 'text' | 'choice-selected' | 'error';
        content: string;
        tags?: string[];
        id: string;
    };

    let activeFilePath = '';
    let story: any = null;
    let history: DisplayItem[] = [];
    let currentChoices: any[] = [];
    let compilationError: string | null = null;
    let scrollContainer: HTMLElement;

    const onLeafChange = () => {
        loadActiveStory();
    };

    onMount(() => {
        plugin.app.workspace.on('active-leaf-change', onLeafChange);
        loadActiveStory();
    });

    onDestroy(() => {
        plugin.app.workspace.off('active-leaf-change', onLeafChange);
    });

    afterUpdate(() => {
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    });

    async function loadActiveStory() {
        const file = plugin.app.workspace.getActiveFile();
        if (file && (file.extension === 'md' || file.extension === 'ink')) {
            if (activeFilePath === file.path && story) return;

            activeFilePath = file.path;
            const content = await plugin.app.vault.read(file);

            let inkString = '';
            if (file.extension === 'ink') {
                // Raw .ink file — use directly
                inkString = content;
            } else {
                // Markdown file — try to extract fenced ink block first
                const block = extractInkBlock(content);
                if (block) {
                    inkString = block.inkSource;
                } else {
                    // Legacy fallback: HTML-comment format → tree → Ink
                    const ast = htmlCommentToJson(content);
                    inkString = astToInk(ast);
                }
            }

            console.log('Ink Player: Compiling story from', file.path);
            console.log('Ink String Length:', inkString.length);
            // console.log("Ink String Preview:", inkString.substring(0, 500));

            try {
                // If we already have a story for this file, use it
                if (
                    view.story &&
                    activeFilePath === view.story._activeFilePath
                ) {
                    story = view.story;
                } else {
                    console.log(
                        'Lineage: Compiling Ink story (Length:',
                        inkString.length,
                        ')',
                    );
                    const compiler = new Compiler(inkString);
                    const compiledStory = compiler.Compile();
                    story = new Story(compiledStory.ToJson());
                    story._activeFilePath = activeFilePath;
                    view.story = story;
                }
                compilationError = null;
                history = [];
                currentChoices = [];
                continueStory();
            } catch (e: any) {
                console.error('Lineage: Ink Compilation Error:', e);
                compilationError = e.message || String(e);
                if (e.stack) {
                    console.error('Lineage: Stack trace:', e.stack);
                }
                console.log(
                    'Lineage: Ink snippet (first 200 chars):',
                    inkString.substring(0, 200),
                );
                story = null;
                history = [];
                currentChoices = [];
            }
        } else {
            activeFilePath = '';
            story = null;
            history = [];
            currentChoices = [];
            compilationError = null;
        }
    }

    function continueStory() {
        if (!story) return;

        let newItems: DisplayItem[] = [];
        while (story.canContinue) {
            const line = story.Continue().trim();
            if (line) {
                newItems.push({
                    type: 'text',
                    content: line,
                    tags: [...story.currentTags],
                    id: Math.random().toString(36).substr(2, 9),
                });
            }
        }

        history = [...history, ...newItems];
        currentChoices = story.currentChoices;
    }

    function chooseChoice(index: number) {
        if (!story) return;
        const choice = currentChoices[index];
        story.ChooseChoiceIndex(index);

        history = [
            ...history,
            {
                type: 'choice-selected',
                content: choice.text,
                id: Math.random().toString(36).substr(2, 9),
            },
        ];

        currentChoices = [];
        continueStory();
    }

    function restartStory() {
        activeFilePath = ''; // Force reload
        loadActiveStory();
    }

    function getImageUrl(tag: string): string | null {
        if (tag.startsWith('image:')) {
            const path = tag.replace('image:', '').trim();
            const file = plugin.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) {
                return plugin.app.vault.getResourcePath(file);
            }
            // Fallback for relative paths if possible (simplified here)
            return path;
        }
        return null;
    }
</script>

<div class="lineage-ink-presentation">
    <div class="player-header">
        <div class="status-bar">
            {#if activeFilePath}
                <span class="file-info" title={activeFilePath}>
                    Playing: <strong>{activeFilePath.split('/').pop()}</strong>
                </span>
            {:else}
                <span class="file-info">No active story</span>
            {/if}
            <button
                class="restart-btn"
                on:click={restartStory}
                disabled={!story}
            >
                Restart
            </button>
        </div>
    </div>

    <div class="story-viewport" bind:this={scrollContainer}>
        {#if compilationError}
            <div class="error-panel" in:fade>
                <div class="error-header">Compilation Error</div>
                <div class="error-msg">{compilationError}</div>
                <div class="error-hint">
                    Check your Ink syntax in the Editor tab.
                </div>
            </div>
        {/if}

        <div class="history-container">
            {#each history as item (item.id)}
                <div
                    class="history-item {item.type}"
                    in:fade={{ duration: 300 }}
                >
                    {#if item.tags}
                        {#each item.tags as tag}
                            {@const imgUrl = getImageUrl(tag)}
                            {#if imgUrl}
                                <div class="story-image-container">
                                    <img
                                        src={imgUrl}
                                        alt="Story logic asset"
                                        class="story-image"
                                    />
                                </div>
                            {/if}
                        {/each}
                    {/if}

                    <div class="content-text">
                        {#if item.type === 'choice-selected'}
                            <span class="choice-marker">›</span>
                        {/if}
                        {item.content}
                    </div>
                </div>
            {/each}
        </div>

        {#if currentChoices.length > 0}
            <div class="choices-panel" in:slide>
                {#each currentChoices as choice, i}
                    <button
                        class="choice-bubble"
                        on:click={() => chooseChoice(i)}
                    >
                        {choice.text}
                    </button>
                {/each}
            </div>
        {:else if story && !story.canContinue && history.length > 0}
            <div class="story-end" in:fade>The End</div>
        {/if}
    </div>
</div>

<style>
    .lineage-ink-presentation {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--background-primary);
        font-family: var(--font-text);
        color: var(--text-normal);
        overflow: hidden;
    }

    .player-header {
        padding: 8px 12px;
        background: var(--background-secondary);
        border-bottom: 1px solid var(--background-modifier-border);
    }

    .status-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
    }

    .file-info {
        font-size: 0.75em;
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .restart-btn {
        font-size: 0.7em;
        padding: 2px 8px;
        height: auto;
    }

    .story-viewport {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        scroll-behavior: smooth;
    }

    .history-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .history-item {
        line-height: 1.6;
        font-size: 1.05em;
        animation: slideIn 0.4s ease-out;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .history-item.choice-selected {
        color: var(--text-muted);
        font-style: italic;
        padding-left: 12px;
        border-left: 2px solid var(--background-modifier-border);
        font-size: 0.95em;
    }

    .choice-marker {
        color: var(--color-accent);
        margin-right: 8px;
        font-weight: bold;
    }

    .choices-panel {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 10px;
        padding-bottom: 40px;
    }

    .choice-bubble {
        text-align: left;
        padding: 12px 16px;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-m);
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.95em;
        color: var(--text-normal);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .choice-bubble:hover {
        background: var(--background-modifier-hover);
        border-color: var(--color-accent);
        transform: translateX(4px);
    }

    .story-image-container {
        margin: 12px 0;
        border-radius: var(--radius-m);
        overflow: hidden;
        background: var(--background-secondary-alt);
        max-width: 100%;
        line-height: 0;
    }

    .story-image {
        max-width: 100%;
        height: auto;
        display: block;
    }

    .story-end {
        text-align: center;
        color: var(--text-faint);
        padding: 40px 0;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-size: 0.8em;
    }

    .error-panel {
        background: rgba(var(--color-red-rgb), 0.1);
        border: 1px solid var(--color-red);
        color: var(--color-red);
        padding: 16px;
        border-radius: var(--radius-m);
        margin-bottom: 20px;
    }

    .error-header {
        font-weight: bold;
        margin-bottom: 8px;
        text-transform: uppercase;
        font-size: 0.8em;
    }

    .error-msg {
        font-family: var(--font-monospace);
        font-size: 0.85em;
        white-space: pre-wrap;
        margin-bottom: 12px;
    }

    .error-hint {
        font-size: 0.75em;
        opacity: 0.8;
        font-style: italic;
    }
</style>
