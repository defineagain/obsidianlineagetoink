<script lang="ts">
    import { getView } from 'src/view/components/container/context';
    import { setContext } from 'svelte';
    import { debounce } from 'obsidian';

    const view = getView();
    const documentStore = view.documentStore;

    let storyLogic = "";
    let title = "";
    
    // Subscribe to frontmatter changes
    const unsub = documentStore.subscribe((state) => {
        const fm = state.file.frontmatter;
        const logicMatch = fm.match(/story-logic: \|([\s\S]+?)(?=\n[a-z0-9-]+:|$)/);
        if (logicMatch) {
            storyLogic = logicMatch[1].split('\n').map(line => line.replace(/^  /, '')).join('\n').trim();
        }
        const titleMatch = fm.match(/^title:\s*(.*)$/m);
        if (titleMatch) {
            title = titleMatch[1].trim();
        }
    });

    const updateFrontmatter = debounce((newTitle: string, newLogic: string) => {
        const state = documentStore.getValue();
        const currentFM = state.file.frontmatter;
        
        let newFM = currentFM;
        // Update Title - ensure it exists
        if (newFM.match(/^title:.*$/m)) {
            newFM = newFM.replace(/^title:.*$/m, `title: ${newTitle}`);
        } else {
            newFM = `title: ${newTitle}\n` + newFM;
        }

        // Update Logic
        const logicKey = 'story-logic: |';
        const logicBlock = `${logicKey}\n  ${newLogic.trim().replace(/\n/g, '\n  ')}`;
        
        if (newFM.includes(logicKey)) {
            newFM = newFM.replace(/story-logic: \|[\s\S]+?(?=\n[a-z0-9-]+:|$)/, logicBlock);
        } else {
            // Append before closing dashes or at end
            if (newFM.trim() === "") {
                newFM = `---\n${logicBlock}\n---`;
            } else {
                newFM = newFM.replace(/(?=\n---)/, `\n${logicBlock}`);
            }
        }
        
        if (newFM !== currentFM) {
            documentStore.dispatch({
                type: 'document/file/update-frontmatter',
                payload: {
                    frontmatter: newFM
                }
            });
        }
    }, 500);

</script>

<div class="parameters-container">
    <div class="parameters-section">
        <label for="ink-title">Story Title</label>
        <input 
            id="ink-title"
            type="text" 
            bind:value={title} 
            on:input={(e) => updateFrontmatter(e.currentTarget.value, storyLogic)}
            placeholder="Story Title..."
        />
    </div>

    <div class="parameters-section logic-section">
        <div class="parameters-header">
            <h3>Ink Story Logic</h3>
            <span>Global VAR, CONST, and functions</span>
        </div>
        <textarea 
            class="logic-editor" 
            bind:value={storyLogic} 
            on:input={(e) => updateFrontmatter(title, e.currentTarget.value)}
            placeholder="VAR variable_name = value..."
        ></textarea>
    </div>
</div>

<style>
    .parameters-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 0 10px;
        gap: 20px;
    }
    .parameters-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .logic-section {
        flex: 1;
        overflow: hidden;
    }
    .parameters-section label {
        font-weight: bold;
        font-size: 0.9em;
        color: var(--text-muted);
    }
    .parameters-section input {
        width: 100%;
        background: var(--background-primary);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        padding: 6px 10px;
    }
    .parameters-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--background-modifier-border);
    }
    .parameters-header h3 {
        margin: 0;
        font-size: 1.1em;
    }
    .parameters-header span {
        font-size: 0.8em;
        color: var(--text-muted);
    }
    .logic-editor {
        flex: 1;
        width: 100%;
        background: var(--background-primary);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        font-family: var(--font-monospace);
        font-size: 0.9em;
        padding: 10px;
        resize: none;
    }
</style>
