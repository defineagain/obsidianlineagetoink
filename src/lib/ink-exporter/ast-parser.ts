import { TreeNode } from 'src/lib/data-conversion/x-to-json/columns-to-json';

export const translateLinks = (text: string): string => {
    // Translates [[Knot#Stitch|Alias]]
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

function getInkIdentifier(text: string, fallback: string): string {
    // Look for first H1: # Title
    const match = text.match(/^#\s+(.*)$/m);
    const rawName = match ? match[1].trim() : text.trim().split('\n')[0].substring(0, 30).trim();
    
    // Slugify: lowercase, replace spaces with underscores, strip non-alphanumeric
    let identifier = rawName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
        
    return identifier || fallback;
}

export const astToInk = (nodes: TreeNode[], depth: number = 0): string => {
    let result = "";
    
    // Weave nesting level: Column 2 (depth 1) is level 1 (*), Column 3 (depth 2) is level 2 (**), etc.
    const weaveLevel = depth;
    
    // Nodes in Column 2+ can be weave elements if they have markers or are in a weave-heavy context.
    const isWeaveDepth = depth >= 1;

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        let content = translateLinks(node.content);
        let prefix = "";
        
        const trimmed = content.replace(/^#+\s*/, '').trim();
        const hasManualMarker = trimmed.startsWith('*') || trimmed.startsWith('+') || trimmed.startsWith('-');
        const hasExplicitDivert = content.includes('->');

        const isChoiceOrGather = hasManualMarker || (isWeaveDepth && depth > 1);

        if (depth === 0) {
            // Column 1 -> Knot OR Global Preamble
            const isGlobalLogic = trimmed.startsWith('VAR ') || 
                                 trimmed.startsWith('CONST ') || 
                                 trimmed.startsWith('LIST ') || 
                                 trimmed.startsWith('EXTERNAL ') || 
                                 trimmed.startsWith('== function ') ||
                                 trimmed.startsWith('//');

            if (trimmed.startsWith('===') || isGlobalLogic) {
                result += `\n${trimmed}\n`;
            } else {
                const name = getInkIdentifier(content, `knot_${i}`);
                result += `\n=== ${name} ===\n`;
                result += `${trimmed}\n`;
            }
        } else if (depth === 1) {
            // Column 2 -> Stitch OR Choice Level 1
            if (trimmed.startsWith('=') || hasManualMarker) {
                if (trimmed.startsWith('=')) {
                    result += `\n${trimmed}\n`;
                } else {
                    // It's a weave element at depth 1
                    prefix = ""; // Handled by the content itself or manual markers
                }
            } else {
                const name = getInkIdentifier(content, `stitch_${i}`);
                result += `\n= ${name}\n`;
                result += `${trimmed}\n`;
            }
        } else if (isWeaveDepth) {
            // Column 3+ -> Weave (Choices and Gathers)
            if (!hasManualMarker) {
                const marker = trimmed.startsWith('+') ? '+' : '*';
                prefix = marker.repeat(weaveLevel) + " ";
            }
        }

        // Choice Terminal Protection
        const isChoice = hasManualMarker ? (trimmed.startsWith('*') || trimmed.startsWith('+')) : (isWeaveDepth && depth > 1);
        const hasChildren = node.children && node.children.length > 0;
        
        let suffix = "";
        if (isChoice && !hasChildren && !hasExplicitDivert) {
            suffix = " -> END";
        }

        if (prefix) {
            result += `${prefix}${trimmed}${suffix}\n`;
        } else if (depth >= 1) {
             // If we already added a header, don't repeat the line
             if (!trimmed.startsWith('===') && !trimmed.startsWith('=')) {
                result += `${trimmed}${suffix}\n`;
             }
        } else {
            result += `${trimmed}${suffix}\n`;
        }

        if (hasChildren) {
            // Auto-Divert for Knots/Stitches
            if (depth < 2 && !hasExplicitDivert) {
                // Peek at first child to see if we should divert
            }
            result += astToInk(node.children, depth + 1);
        }
    }
    
    return result;
};
