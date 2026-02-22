import { ItemView, WorkspaceLeaf } from 'obsidian';
import Lineage from '../main';
import PropertyEditorComponent from './components/property-editor/PropertyEditor.svelte';

export const PROPERTY_EDITOR_VIEW_TYPE = 'lineage-property-editor';

export class PropertyEditorView extends ItemView {
    component: PropertyEditorComponent;
    plugin: Lineage;

    constructor(leaf: WorkspaceLeaf, plugin: Lineage) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return PROPERTY_EDITOR_VIEW_TYPE;
    }

    getDisplayText() {
        return "Ink Properties";
    }

    getIcon() {
        return "settings";
    }

    async onOpen() {
        this.component = new PropertyEditorComponent({
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
