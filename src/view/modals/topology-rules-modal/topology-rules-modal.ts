import { Modal, App } from 'obsidian';
import Content from './components/modal-content.svelte';

export class TopologyRulesModal extends Modal {
    constructor(app: App, private rulesMarkdown: string) {
        super(app);
    }

    onOpen() {
        this.setTitle('Ink-Lineage Topology Rules');
        new Content({
            target: this.contentEl,
            props: {
                app: this.app,
                rulesMarkdown: this.rulesMarkdown,
            },
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
