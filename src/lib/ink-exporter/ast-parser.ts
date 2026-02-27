import { TreeNode } from 'src/lib/data-conversion/x-to-json/columns-to-json';

/**
 * Converts a Lineage tree back to Ink source.
 *
 * Since the Ink-native parser preserves content verbatim (inline logic,
 * conditionals, diverts, comments), the exporter must reconstruct
 * structural markers from tree headers and output prose as-is.
 *
 * Mapping:
 *   - Depth 0 nodes starting with `# name` → `=== name ===`
 *   - Depth 1 nodes starting with `## name` → `= name`
 *   - Nodes starting with `*`, `+`, `-` → output verbatim (already marked)
 *   - Everything else → output verbatim
 */
export const astToInk = (nodes: TreeNode[], depth: number = 0): string => {
    let result = '';

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const lines = node.content.split('\n');
        const firstLine = lines[0].trim();

        // Detect structural headers from the importer
        const knotMatch = firstLine.match(/^#\s+(.+)$/);
        const stitchMatch = firstLine.match(/^##\s+(.+)$/);

        if (depth === 0 && knotMatch && !stitchMatch) {
            // Knot header — reconstruct `=== name ===`
            const name = knotMatch[1].trim();
            result += `\n=== ${name} ===\n`;
            // Output remaining lines of this node verbatim
            for (let j = 1; j < lines.length; j++) {
                result += lines[j] + '\n';
            }
        } else if (depth <= 1 && stitchMatch) {
            // Stitch header — reconstruct `= name`
            const name = stitchMatch[1].trim();
            result += `\n= ${name}\n`;
            // Output remaining lines
            for (let j = 1; j < lines.length; j++) {
                result += lines[j] + '\n';
            }
        } else {
            // Everything else: choices, gathers, prose — output verbatim
            // Expand compact markers (**, ++) back to space-separated (*, * *)
            for (let j = 0; j < lines.length; j++) {
                result += expandMarkers(lines[j]) + '\n';
            }
        }

        // Recurse into children
        if (node.children && node.children.length > 0) {
            result += astToInk(node.children, depth + 1);
        }
    }

    return result;
};

/**
 * Translates [[Wikilinks]] to Ink diverts.
 * Kept for backward compatibility with legacy documents.
 */
export const translateLinks = (text: string): string => {
    return text.replace(/\[\[(.*?)\]\]/g, (match, content) => {
        let alias = '';
        let target = content;

        if (content.includes('|')) {
            const parts = content.split('|');
            target = parts[0];
            alias = parts[1];
        }

        if (target.toUpperCase() === 'END') {
            return `-> END`;
        }

        target = target.replace('#', '.');
        target = target.replace(/\s+/g, '_').toLowerCase();

        if (alias) {
            return `* ${alias} -> ${target}`;
        } else {
            return `-> ${target}`;
        }
    });
};

/**
 * Expands compact choice/gather markers back to space-separated Ink form.
 * e.g. `** [Choice]` → `* * [Choice]`, `-- (label)` → `- - (label)`
 * Only expands at the start of a line where markers are consecutive.
 */
function expandMarkers(line: string): string {
    return line.replace(/^(\*{2,}|\+{2,}|-{2,})(\s)/, (match, markers, space) => {
        return markers.split('').join(' ') + space;
    });
}

