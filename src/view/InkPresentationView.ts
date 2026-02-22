import { ItemView, WorkspaceLeaf } from 'obsidian';
import Lineage from '../main';
import InkPresentationComponent from './components/ink-presentation/InkPresentation.svelte';

export const INK_PRESENTATION_VIEW_TYPE = 'lineage-ink-presentation';

export class InkPresentationView extends ItemView {
    component: InkPresentationComponent;
    plugin: Lineage;

    constructor(leaf: WorkspaceLeaf, plugin: Lineage) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return INK_PRESENTATION_VIEW_TYPE;
    }

    getDisplayText() {
        return "Ink Presentation";
    }

    getIcon() {
        return "play";
    }

    async onOpen() {
        this.component = new InkPresentationComponent({
            target: this.contentEl,
            props: {
                plugin: this.plugin
            }
        });
    }

    async onClose() {
        if (this.component) {
            this.component.$destroy();
        }
    }
}
