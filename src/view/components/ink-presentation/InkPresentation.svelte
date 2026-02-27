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

    import { RotateCcw, ArrowLeft } from 'lucide-svelte';

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
    let undoStack: string[] = []; // Store story state snapshots
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
            // Restore from view state if available and targeting the same file
            if (view.inkState && view.inkState.path === file.path && view.story) {
                activeFilePath = view.inkState.path;
                story = view.story;
                history = view.inkState.history;
                currentChoices = view.inkState.currentChoices;
                undoStack = view.inkState.undoStack || [];
                return;
            }

            if (activeFilePath === file.path && story) return;

            activeFilePath = file.path;
            const content = await plugin.app.vault.read(file);

            let inkString = '';
            if (file.extension === 'ink') {
                inkString = content;
            } else {
                const block = extractInkBlock(content);
                if (block) {
                    inkString = block.inkSource;
                } else {
                    const ast = htmlCommentToJson(content);
                    inkString = astToInk(ast);
                }
            }

            try {
                const compiler = new Compiler(inkString);
                const compiledStory = compiler.Compile();
                story = new Story(compiledStory.ToJson());
                story._activeFilePath = activeFilePath;
                view.story = story;
                
                compilationError = null;
                history = [];
                currentChoices = [];
                undoStack = [];
                
                // Initialize view state
                saveStateToView();
                continueStory();
            } catch (e: any) {
                console.error('Lineage: Ink Compilation Error:', e);
                compilationError = e.message || String(e);
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

    function saveStateToView() {
        if (!activeFilePath) return;
        view.inkState = {
            path: activeFilePath,
            history: history,
            currentChoices: currentChoices,
            undoStack: undoStack
        };
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
        saveStateToView();
    }

    function chooseChoice(index: number) {
        if (!story) return;
        
        // Save snapshot for undo
        undoStack = [...undoStack, story.state.ToJson()];
        
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

    function undoChoice() {
        if (!story || undoStack.length === 0) return;
        
        const lastState = undoStack.pop();
        if (!lastState) return;
        
        story.state.LoadJson(lastState);
        undoStack = [...undoStack]; // Trigger reactivity
        
        // Remove everything after the last'choice-selected' in history
        const lastChoiceIndex = findLastIndex(history, item => item.type === 'choice-selected');
        if (lastChoiceIndex !== -1) {
            history = history.slice(0, lastChoiceIndex);
        } else {
            history = [];
        }
        
        currentChoices = story.currentChoices;
        saveStateToView();
    }

    function restartStory() {
        // Clear view state to force full reload
        if (view.inkState) delete view.inkState;
        activeFilePath = ''; 
        loadActiveStory();
    }

    function findLastIndex<T>(array: T[], predicate: (value: T) => boolean): number {
        for (let i = array.length - 1; i >= 0; i--) {
            if (predicate(array[i])) return i;
        }
        return -1;
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
                    <strong>{activeFilePath.split('/').pop()}</strong>
                </span>
            {:else}
                <span class="file-info">No active story</span>
            {/if}
            <div class="header-actions">
                <button
                    class="action-btn"
                    on:click={undoChoice}
                    disabled={!story || undoStack.length === 0}
                    title="Back (Undo)"
                >
                    <ArrowLeft size={14} />
                </button>
                <button
                    class="action-btn"
                    on:click={restartStory}
                    disabled={!story}
                    title="Restart Story"
                >
                    <RotateCcw size={14} />
                </button>
            </div>
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

    .header-actions {
        display: flex;
        gap: 6px;
    }

    .action-btn {
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-s);
        color: var(--text-muted);
        padding: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
    }

    .action-btn:hover:not(:disabled) {
        color: var(--text-normal);
        background: var(--background-modifier-hover);
        border-color: var(--color-accent);
    }

    .action-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
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
