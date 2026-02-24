import { slugify } from '../../helpers/slugify';

export type BlockType = 'knot' | 'stitch' | 'choice' | 'sticky' | 'gather' | 'divert' | 'plain';

export function reformatBlock(content: string, targetType: BlockType): string {
    let body = content;
    
    // Regular expressions for stripping ANY leading Ink markers
    // knot: === name ===
    // stitch: = name
    // weave: * or + or -
    // divert: ->
    const markerRegexes = [
        /^===\s*[^=]*?\s*===\s*/m,
        /^=\s*[^=]*?\s*/m,
        /^(\*|\+|-|->)\s*/m
    ];

    // Detect and strip ALL existing primary markers from the start in a loop
    let changed = true;
    while (changed) {
        changed = false;
        for (const regex of markerRegexes) {
            if (regex.test(body)) {
                body = body.replace(regex, '');
                changed = true;
                break;
            }
        }
        body = body.trimStart();
    }

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
