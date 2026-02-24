import { Notice } from 'obsidian';
import Lineage from 'src/main';
import { loadFromDisk } from 'src/obsidian/helpers/load-from-disk';
import { inkToAst } from 'src/lib/ink-importer/ast-parser';
import { jsonToHtmlComment } from 'src/lib/data-conversion/json-to-x/json-to-html-comment';
import { createNewFile } from 'src/obsidian/events/workspace/effects/create-new-file';
import { openFileInLineage } from 'src/obsidian/events/workspace/effects/open-file-in-lineage';
import { onPluginError } from 'src/lib/store/on-plugin-error';

export const importInk = async (plugin: Lineage) => {
    try {
        loadFromDisk('.ink', async (filename, content) => {
            try {
                // 1. Parse Ink to AST
                const { tree, logic } = inkToAst(content);

                // 2. Convert AST to Lineage Markdown (HTML comment format)
                const body = jsonToHtmlComment(tree);
                
                // 3. Prepare frontmatter with story-logic
                const logicBlock = logic.trim() ? `story-logic: |\n  ${logic.trim().replace(/\n/g, '\n  ')}\n` : "";
                const frontmatter = `---\ntitle: ${filename}\n${logicBlock}---\n\n`;
                const fullContent = frontmatter + body;

                // 4. Create file in vault
                const folder = plugin.app.vault.getRoot();
                const basename = filename.replace(/\.ink$/, '');
                
                const file = await createNewFile(plugin, folder, fullContent, basename);
                
                if (file) {
                    new Notice(`Imported ${filename}`);
                    // 5. Open in Lineage view
                    await openFileInLineage(plugin, file, 'sections', 'tab');
                }
            } catch (e) {
                onPluginError(e, 'command', 'Import Ink file');
            }
        });
    } catch (e) {
        onPluginError(e, 'command', 'Import Ink file');
    }
};
