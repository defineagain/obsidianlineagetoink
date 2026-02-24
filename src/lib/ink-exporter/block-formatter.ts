import { slugify } from '../../helpers/slugify';

export type BlockType = 'knot' | 'stitch' | 'choice' | 'sticky' | 'gather' | 'divert' | 'plain';

export function reformatBlock(content: string, targetType: BlockType): string {
    const lines = content.split('\n');
    let body = content;
    
    // Regular expressions for various markers
    const knotRegex = /^===\s*([^=]*?)\s*===\s*/;
    const stitchRegex = /^=\s*([^=]*?)\s*/;
    const weaveRegex = /^(\*|\+|-|->)\s*/;

    // Detect and strip ALL existing primary markers from the start in a loop
    let strippedContent = body;
    let changed = true;
    while (changed) {
        changed = false;
        if (knotRegex.test(strippedContent)) {
            strippedContent = strippedContent.replace(knotRegex, '');
            changed = true;
        } else if (stitchRegex.test(strippedContent)) {
            strippedContent = strippedContent.replace(stitchRegex, '');
            changed = true;
        } else if (weaveRegex.test(strippedContent)) {
            strippedContent = strippedContent.replace(weaveRegex, '');
            changed = true;
        }
        strippedContent = strippedContent.trimStart();
    }
    body = strippedContent;

    // Now apply the target marker
    switch (targetType) {
        case 'knot': {
            const firstLine = body.split('\n')[0].trim() || 'knot';
            const name = slugify(firstLine);
            // If the first line was used for the name and it's the only line, we might want to keep it or replace it
            // For now, prepend the marker.
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
