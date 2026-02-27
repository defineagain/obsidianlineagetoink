
import { onPluginError } from 'src/lib/store/on-plugin-error';
import { extractFrontmatter } from 'src/view/helpers/extract-frontmatter';
import { extractInkBlock } from 'src/lib/ink-block/ink-block-utils';
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
        let inkSource: string;

        // Try Ink-native extraction first
        const block = extractInkBlock(fileData);
        if (block) {
            // Direct extraction — no conversion needed
            inkSource = block.inkSource;
        } else {
            // Legacy fallback: HTML-comment format
            const { body, frontmatter } = extractFrontmatter(fileData);
            const tree = htmlCommentToJson(body);
            
            const logicMatch = frontmatter.match(/story-logic: \|([\s\S]+?)(?=\n[a-z0-9_-]+:|\n---|\s*$)/);
            const logic = logicMatch ? logicMatch[1].split('\n').map((line: string) => line.replace(/^  /, '')).join('\n').trim() : "";

            inkSource = astToInk(tree);
            if (logic) {
                inkSource = `${logic}\n\n${inkSource}`;
            }
        }

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
