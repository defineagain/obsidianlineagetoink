import { Notice } from 'obsidian';
import Lineage from 'src/main';
import { loadFromDisk } from 'src/obsidian/helpers/load-from-disk';
import { injectInkBlock } from 'src/lib/ink-block/ink-block-utils';
import { createNewFile } from 'src/obsidian/events/workspace/effects/create-new-file';
import { openFileInLineage } from 'src/obsidian/events/workspace/effects/open-file-in-lineage';
import { onPluginError } from 'src/lib/store/on-plugin-error';

export const importInk = async (plugin: Lineage) => {
    try {
        loadFromDisk('.ink', async (filename, content) => {
            try {
                // 1. Wrap raw Ink source in a fenced block inside markdown
                const frontmatter = `---\ntitle: ${filename}\n---\n`;
                const fullContent = frontmatter + '\n' + injectInkBlock('', content, '');

                // 2. Create file in vault
                const folder = plugin.app.vault.getRoot();
                const basename = filename.replace(/\.ink$/, '');
                
                const file = await createNewFile(plugin, folder, fullContent, basename);
                
                if (file) {
                    new Notice(`Imported ${filename}`);
                    // 3. Open in Lineage view (format auto-detected as 'ink')
                    await openFileInLineage(plugin, file, 'ink', 'tab');
                }
            } catch (e) {
                onPluginError(e, 'command', 'Import Ink file');
            }
        });
    } catch (e) {
        onPluginError(e, 'command', 'Import Ink file');
    }
};
