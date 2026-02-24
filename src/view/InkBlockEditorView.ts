import { ItemView, WorkspaceLeaf } from 'obsidian';
import Lineage from '../main';
import InkBlockEditorComponent from './components/ink-block-editor/InkBlockEditor.svelte';

export const INK_BLOCK_EDITOR_VIEW_TYPE = 'lineage-ink-block-editor';

export class InkBlockEditorView extends ItemView {
    component: InkBlockEditorComponent;
    plugin: Lineage;

    constructor(leaf: WorkspaceLeaf, plugin: Lineage) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return INK_BLOCK_EDITOR_VIEW_TYPE;
    }

    getDisplayText() {
        return "Ink Block Editor";
    }

    getIcon() {
        return "layout-grid";
    }

    async onOpen() {
        this.component = new InkBlockEditorComponent({
            target: this.contentEl,
            props: {
                plugin: this.plugin,
                view: this
            }
        });
    }

    async onClose() {
        if (this.component) {
            this.component.$destroy();
        }
    }
}
