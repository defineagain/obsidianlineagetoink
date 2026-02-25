import { slugify } from '../../helpers/slugify';

export type BlockType = 'knot' | 'stitch' | 'choice' | 'sticky' | 'gather' | 'divert' | 'plain';

/**
 * Detect the current block type from content markers.
 * Inverse of reformatBlock — used for taxonomy state feedback.
 */
export function detectBlockType(content: string): BlockType {
    const trimmed = content.trim();
    if (/^===\s/.test(trimmed)) return 'knot';
    if (/^=\s[^=]/.test(trimmed)) return 'stitch';
    if (/^#\s/.test(trimmed)) return 'knot';   // Markdown-style knot header
    if (/^##\s/.test(trimmed)) return 'stitch'; // Markdown-style stitch header
    if (/^\*\s/.test(trimmed)) return 'choice';
    if (/^\+\s/.test(trimmed)) return 'sticky';
    if (/^->/.test(trimmed)) return 'divert';
    if (/^-\s/.test(trimmed)) return 'gather';
    return 'plain';
}

/**
 * Radical Reset Strategy:
 * 1. Split content into lines.
 * 2. Strip leading Knot/Stitch header lines entirely.
 * 3. Strip leading Weave/Divert markers from the first content line.
 * 4. Rebuild from the pure body.
 */
export function reformatBlock(content: string, targetType: BlockType): string {
    let lines = content.split('\n');
    
    // 1. Strip leading empty lines and structural headers (Knot/Stitch)
    while (lines.length > 0) {
        const line = lines[0].trim();
        if (!line) {
            lines.shift();
            continue;
        }

        // Knot Header: === name ===
        if (/^===\s*[^=]*?\s*===\s*$/.test(line)) {
            lines.shift();
            continue;
        }

        // Stitch Header: = name
        if (/^=\s*[^=]*?$/.test(line)) {
            lines.shift();
            continue;
        }

        break;
    }

    // 2. Clear markers from the first remaining content line
    if (lines.length > 0) {
        // Strip any number of *, +, -, or -> markers from the start of the first content line
        lines[0] = lines[0].replace(/^(\*|\+|-|->)+\s*/, '');
        
        // If stripping markers left the line empty, shift it and try again for the next line
        // (but only once to avoid over-stripping actual story content)
        if (!lines[0].trim()) {
            lines.shift();
        }
    }

    const body = lines.join('\n').trimStart();

    // 3. Apply the new configuration
    switch (targetType) {
        case 'knot': {
            const firstLine = body.split('\n')[0].trim() || 'knot';
            const name = slugify(firstLine);
            return `=== ${name} ===\n${body}`;
        }
        case 'stitch': {
            const firstLine = body.split('\n')[0].trim() || 'stitch';
            const name = slugify(firstLine);
            return `= ${name}\n${body}`;
        }
        case 'choice':
            return `* ${body}`;
        case 'sticky':
            return `+ ${body}`;
        case 'gather':
            return `- ${body}`;
        case 'divert':
            return `-> ${body}`;
        case 'plain':
            return body;
        default:
            return content;
    }
}
