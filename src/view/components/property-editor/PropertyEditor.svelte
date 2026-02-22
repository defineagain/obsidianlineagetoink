<script lang="ts">
    import Lineage from 'src/main';
    import { PropertyEditorView } from 'src/view/PropertyEditorView';
    import { TFile } from 'obsidian';

    export let plugin: Lineage;
    export let view: PropertyEditorView;

    let properties: { name: string, type: 'VAR' | 'CONST', value: string }[] = [];
    let activeFilePath = "";
    
    // We bind to active leaf change in Obsidian
    plugin.app.workspace.on('active-leaf-change', () => {
        loadActiveFile();
    });

    // Run on mount
    import { onMount } from 'svelte';
    onMount(() => {
        loadActiveFile();
    });

    async function loadActiveFile() {
        const file = plugin.app.workspace.getActiveFile();
        if (file && file.extension === 'md') {
            await loadProperties(file);
        } else {
            activeFilePath = "";
            properties = [];
        }
    }

    async function loadProperties(file: TFile) {
        activeFilePath = file.path;
        const configPath = file.path.replace(/\.md$/, '.inkconfig');
        try {
            const configFile = plugin.app.vault.getAbstractFileByPath(configPath);
            if (configFile && configFile instanceof TFile) {
                const data = await plugin.app.vault.read(configFile);
                properties = JSON.parse(data);
            } else {
                properties = [];
            }
        } catch(e) {
            properties = [];
        }
    }
    
    async function saveProperties() {
        if (!activeFilePath) return;
        const configPath = activeFilePath.replace(/\.md$/, '.inkconfig');
        const data = JSON.stringify(properties, null, 2);
        try {
            const configFile = plugin.app.vault.getAbstractFileByPath(configPath);
            if (configFile && configFile instanceof TFile) {
                await plugin.app.vault.modify(configFile, data);
            } else {
                await plugin.app.vault.create(configPath, data);
            }
        } catch(e) {
            console.error("Failed to save properties", e);
        }
    }
    
    function addProperty() {
        properties = [...properties, { name: 'var_name', type: 'VAR', value: 'value' }];
        saveProperties();
    }
    
    function removeProperty(index: number) {
        properties = properties.filter((_, i) => i !== index);
        saveProperties();
    }
</script>

<div class="lineage-ink-property-editor">
    {#if activeFilePath}
        <h4>Ink Properties</h4>
        <div class="property-editor-subtitle">Editing for: {activeFilePath.split('/').pop()}</div>
        
        <div class="properties-list">
            {#each properties as prop, i}
                <div class="property-row">
                    <select class="dropdown" bind:value={prop.type} on:change={saveProperties}>
                        <option value="VAR">VAR</option>
                        <option value="CONST">CONST</option>
                    </select>
                    <input class="input" type="text" bind:value={prop.name} on:input={saveProperties} placeholder="Name" />
                    <input class="input" type="text" bind:value={prop.value} on:input={saveProperties} placeholder="Value" />
                    <button class="clickable-icon" aria-label="Delete property" on:click={() => removeProperty(i)}>
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            {/each}
        </div>
        <button class="mod-cta add-button" on:click={addProperty}>+ Add Property</button>
    {:else}
        <div class="empty-state">
            <p>No active markdown file.</p>
        </div>
    {/if}
</div>

<style>
    .lineage-ink-property-editor {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .property-editor-subtitle {
        font-size: 0.8em;
        color: var(--text-muted);
        margin-bottom: 1rem;
    }

    .properties-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .property-row {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        background: var(--background-secondary);
        padding: 0.5rem;
        border-radius: var(--radius-s);
    }

    .property-row .input {
        width: 100%;
        min-width: 0;
    }
    
    .property-row .dropdown {
        width: 80px;
    }

    .add-button {
        margin-top: 1rem;
        width: 100%;
    }

    .empty-state {
        color: var(--text-muted);
        text-align: center;
        margin-top: 2rem;
    }
</style>
