<script lang="ts">
    import { onMount } from 'svelte';
    import Lineage from 'src/main';
    import InkBlockEditor from '../ink-block-editor/InkBlockEditor.svelte';
    import InkPresentation from '../ink-presentation/InkPresentation.svelte';
    import InkValuesEditor from '../ink-values-editor/InkValuesEditor.svelte';
    import { Edit, Play, Database } from 'lucide-svelte';

    export let plugin: Lineage;
    export let view: any;

    let activeTab: 'editor' | 'player' | 'values' = 'editor';

    export function setTab(tab: 'editor' | 'player' | 'values') {
        activeTab = tab;
    }

    // Expose setTab to the view
    onMount(() => {
        if (view) {
            view.setTab = setTab;
        }
    });
</script>

<div class="lineage-ink-sidebar-container">
    <div class="sidebar-tabs">
        <button
            class="sidebar-tab-btn"
            class:is-active={activeTab === 'editor'}
            on:click={() => (activeTab = 'editor')}
            title="Ink Block Editor"
        >
            <Edit size={16} />
            <span>Editor</span>
        </button>
        <button
            class="sidebar-tab-btn"
            class:is-active={activeTab === 'player'}
            on:click={() => (activeTab = 'player')}
            title="Ink Player (Presentation)"
        >
            <Play size={16} />
            <span>Player</span>
        </button>
        <button
            class="sidebar-tab-btn"
            class:is-active={activeTab === 'values'}
            on:click={() => (activeTab = 'values')}
            title="Global Variables Editor"
        >
            <Database size={16} />
            <span>Values</span>
        </button>
    </div>

    <div class="sidebar-content">
        {#if activeTab === 'editor'}
            <InkBlockEditor {plugin} {view} />
        {:else if activeTab === 'player'}
            <InkPresentation {plugin} {view} />
        {:else if activeTab === 'values'}
            <InkValuesEditor {plugin} {view} />
        {/if}
    </div>
</div>

<style>
    .lineage-ink-sidebar-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    }

    .sidebar-tabs {
        display: flex;
        gap: 2px;
        padding: 4px;
        background: var(--background-secondary);
        border-bottom: 1px solid var(--background-modifier-border);
    }

    .sidebar-tab-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px;
        font-size: 0.85em;
        background: transparent;
        border: none;
        border-radius: var(--radius-s);
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .sidebar-tab-btn:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
    }

    .sidebar-tab-btn.is-active {
        background: var(--background-primary);
        color: var(--color-accent);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        font-weight: bold;
    }

    .sidebar-content {
        flex: 1;
        overflow-y: auto;
    }
</style>
