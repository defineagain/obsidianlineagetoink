import { slugify } from '../../helpers/slugify';

export type BlockType = 'knot' | 'stitch' | 'choice' | 'sticky' | 'gather' | 'divert' | 'plain';

export function reformatBlock(content: string, targetType: BlockType): string {
    let lines = content.split('\n');
    
    // Strict markers (must be at the start of the line)
    const knotRegex = /^===\s*([^=]*?)\s*===\s*$/;
    const stitchRegex = /^=\s*([^=]*?)\s*$/;
    const weaveRegex = /^(\*|\+|-|->)\s*/;

    // We only strip from the TOP of the file.
    // If we find multiple markers at the top, we keep stripping until we hit actual content.
    while (lines.length > 0) {
        const firstLine = lines[0].trim();
        if(!firstLine) {
            lines.shift();
            continue;
        }

        if (knotRegex.test(firstLine) || stitchRegex.test(firstLine) || weaveRegex.test(firstLine)) {
            lines.shift();
            continue;
        }
        break;
    }

    let body = lines.join('\n').trimStart();

    // Now apply the target marker
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
