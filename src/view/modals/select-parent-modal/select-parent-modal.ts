import { App, FuzzyMatch, FuzzySuggestModal } from 'obsidian';
import { LineageView } from 'src/view/view';

interface NodeSelection {
    id: string;
    content: string;
}

export class SelectParentModal extends FuzzySuggestModal<NodeSelection> {
    constructor(
        app: App,
        private view: LineageView,
        private currentNodeId: string,
        private onSelect: (targetNodeId: string) => void
    ) {
        super(app);
        this.setPlaceholder('Search for a target parent node...');
        this.setInstructions([
            { command: '↑↓', purpose: 'to navigate' },
            { command: '↵', purpose: 'to select' },
            { command: 'esc', purpose: 'to cancel' },
        ]);
    }

    private isDescendant(parentId: string, targetId: string): boolean {
        const docState = this.view.documentStore.getValue();
        const column = docState.document.columns.find((c) =>
            c.groups.some((g) => g.parentId === parentId),
        );
        if (!column) return false;

        const group = column.groups.find((g) => g.parentId === parentId);
        if (!group) return false;

        if (group.nodes.includes(targetId)) return true;

        for (const childId of group.nodes) {
            if (this.isDescendant(childId, targetId)) return true;
        }

        return false;
    }

    getItems(): NodeSelection[] {
        const docState = this.view.documentStore.getValue();
        const items: NodeSelection[] = [];

        for (const [id, node] of Object.entries(docState.document.content)) {
            // Prevent picking self or circular descendants
            if (id === this.currentNodeId) continue;
            if (this.isDescendant(this.currentNodeId, id)) continue;

            const content = (node.content || '')
                .trim()
                .split('\n')[0]
                .substring(0, 100);
            items.push({
                id,
                content: content || `(Empty Node: ${id})`,
            });
        }

        return items;
    }

    getItemText(item: NodeSelection): string {
        return item.content;
    }

    renderSuggestion(match: FuzzyMatch<NodeSelection>, el: HTMLElement) {
        el.createEl('div', { text: match.item.content });
        // @ts-ignore
        el.createEl('small', { text: match.item.id, cls: 'select-parent-sub' });
    }

    onChooseItem(item: NodeSelection, evt: MouseEvent | KeyboardEvent) {
        this.onSelect(item.id);
    }
}
