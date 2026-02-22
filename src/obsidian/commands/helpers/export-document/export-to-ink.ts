
import { onPluginError } from 'src/lib/store/on-plugin-error';
import { extractFrontmatter } from 'src/view/helpers/extract-frontmatter';
import { htmlCommentToJson } from 'src/lib/data-conversion/x-to-json/html-comment-to-json';
import { astToInk } from 'src/lib/ink-exporter/ast-parser';
import { LineageView } from 'src/view/view';
import { saveNodeContent } from 'src/view/actions/keyboard-shortcuts/helpers/commands/commands/helpers/save-node-content';

export const exportToInk = async (view: LineageView) => {
    try {
        const file = view.file;
        if (!file) return;
        if (!file.parent) return;

        const viewState = view.viewStore.getValue();
        const isEditing = Boolean(viewState.document.editing.activeNodeId);
        if (isEditing) {
            saveNodeContent(view);
            setTimeout(() => {
                exportToInk(view);
            }, 100);
            return;
        }

        const fileData = await view.plugin.app.vault.read(file);
        const { body } = extractFrontmatter(fileData);
        const tree = htmlCommentToJson(body);
        
        const inkSource = astToInk(tree);

        // Download to disk via browser API
        const blob = new Blob([inkSource], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.basename + '.ink';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        onPluginError(e, 'command', { type: 'export-to-ink' });
    }
};
