<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { TFile } from 'obsidian';
    import Lineage from 'src/main';
    // @ts-ignore
    import { Compiler, Story } from 'inkjs/full';
    import { astToInk } from 'src/lib/ink-exporter/ast-parser';
    import { htmlCommentToJson } from 'src/lib/data-conversion/x-to-json/html-comment-to-json';

    export let plugin: Lineage;

    let activeFilePath = "";
    let story: any = null;
    let storyText: string[] = [];
    let currentChoices: any[] = [];
    let compilationError: string | null = null;
    
    // We bind to active leaf change in Obsidian
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

    async function loadActiveStory() {
        const file = plugin.app.workspace.getActiveFile();
        if (file && file.extension === 'md') {
            activeFilePath = file.path;
            const content = await plugin.app.vault.read(file);
            const ast = htmlCommentToJson(content);
            const inkString = astToInk(ast);

            try {
                // Compile the ink string
                const compiler = new Compiler(inkString);
                const storyJson = compiler.Compile().ToJson();
                story = new Story(storyJson);
                compilationError = null;
                continueStory();
            } catch (error: any) {
                console.error("Ink compilation error", error);
                compilationError = error.message;
                storyText = [];
                currentChoices = [];
                story = null;
            }
        } else {
            activeFilePath = "";
            story = null;
            storyText = [];
            currentChoices = [];
            compilationError = null;
        }
    }

    function continueStory() {
        if (!story) return;
        let newText = "";
        while (story.canContinue) {
            newText += story.Continue();
        }
        if (newText.trim()) {
            storyText = [...storyText, newText.trim()];
        }
        currentChoices = story.currentChoices;
    }

    function chooseChoice(index: number) {
        if (!story) return;
        story.ChooseChoiceIndex(index);
        storyText = [...storyText, `> ${currentChoices[index].text}`];
        continueStory();
    }
    
    function restartStory() {
        loadActiveStory();
    }
</script>

<div class="lineage-ink-presentation">
    {#if activeFilePath}
        <div class="header">
            <h4>Ink Presentation View</h4>
            <div class="subtitle">Playing: {activeFilePath.split('/').pop()}</div>
            <button class="mod-cta" on:click={restartStory} disabled={!story}>Restart</button>
        </div>

        {#if compilationError}
            <div class="error-box">
                <strong>Compilation Error:</strong>
                <pre>{compilationError}</pre>
            </div>
        {/if}

        <div class="story-content">
            {#each storyText as text}
                <p class="story-text" class:choice-text={text.startsWith('>')}>{text}</p>
            {/each}
        </div>

        {#if currentChoices.length > 0}
            <div class="choices-container">
                {#each currentChoices as choice, i}
                    <button class="choice-button" on:click={() => chooseChoice(i)}>
                        {choice.text}
                    </button>
                {/each}
            </div>
        {/if}
        
        {#if story && currentChoices.length === 0}
            <div class="story-end">*** End of Story ***</div>
        {/if}
    {:else}
        <div class="empty-state">
            <p>No active Lineage markdown file to play.</p>
        </div>
    {/if}
</div>

<style>
    .lineage-ink-presentation {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow-y: auto;
    }

    .header {
        margin-bottom: 2rem;
        border-bottom: 1px solid var(--background-modifier-border);
        padding-bottom: 1rem;
    }

    .subtitle {
        font-size: 0.8em;
        color: var(--text-muted);
        margin-bottom: 1rem;
    }

    .story-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .story-text {
        margin: 0;
        line-height: 1.5;
        color: var(--text-normal);
    }
    
    .choice-text {
        color: var(--text-muted);
        font-style: italic;
    }

    .choices-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: auto;
    }

    .choice-button {
        text-align: left;
        padding: 0.75rem 1rem;
        background-color: var(--interactive-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: var(--radius-m);
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .choice-button:hover {
        background-color: var(--interactive-hover);
    }

    .error-box {
        background-color: var(--background-modifier-error);
        color: var(--text-error);
        padding: 1rem;
        border-radius: var(--radius-m);
        margin-bottom: 1rem;
    }

    .error-box pre {
        white-space: pre-wrap;
        margin-top: 0.5rem;
        font-size: 0.9em;
    }
    
    .story-end {
        text-align: center;
        color: var(--text-muted);
        margin-top: 2rem;
        font-style: italic;
    }

    .empty-state {
        color: var(--text-muted);
        text-align: center;
        margin-top: 4rem;
    }
</style>
