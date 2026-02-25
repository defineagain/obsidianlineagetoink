import { ItemView, WorkspaceLeaf } from 'obsidian';
import Lineage from '../main';
import InkSidebarContainer from './components/ink-sidebar/InkSidebarContainer.svelte';

export const INK_SIDEBAR_VIEW_TYPE = 'lineage-ink-sidebar';

export class InkSidebarView extends ItemView {
    component: InkSidebarContainer;
    plugin: Lineage;

    constructor(leaf: WorkspaceLeaf, plugin: Lineage) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return INK_SIDEBAR_VIEW_TYPE;
    }

    getDisplayText() {
        return "Ink Sidebar";
    }

    getIcon() {
        return "layout-grid";
    }

    async onOpen() {
        this.component = new InkSidebarContainer({
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

    setTab(tab: 'editor' | 'player') {
        // This is overwritten by the Svelte component's setTab
        if (this.component && (this.component as any).setTab) {
            (this.component as any).setTab(tab);
        }
    }
}
