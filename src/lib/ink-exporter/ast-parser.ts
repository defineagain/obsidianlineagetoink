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
    
    // Weave nesting level: Column 3 (depth 2) is level 1 (*), Column 4 is level 2 (**), etc.
    const weaveLevel = depth - 1;
    
    // If a parent node in the previous column has multiple children, they are branching choices.
    // In our simplified "Beat Aggregation", we assume Column 3+ nodes are weave elements.
    const isWeaveDepth = depth >= 2;

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        let content = translateLinks(node.content);
        let prefix = "";
        
        const trimmed = content.replace(/^#+\s*/, '').trim();
        const hasManualMarker = trimmed.startsWith('*') || trimmed.startsWith('+') || trimmed.startsWith('-');
        const hasExplicitDivert = content.includes('->');

        if (depth === 0) {
            // Column 1 -> Knot
            if (trimmed.startsWith('===')) {
                result += `\n${trimmed}\n`;
            } else {
                const name = getInkIdentifier(content, `knot_${i}`);
                result += `\n=== ${name} ===\n`;
                result += `${trimmed}\n`;
            }
        } else if (depth === 1) {
            // Column 2 -> Stitch
            if (trimmed.startsWith('=')) {
                result += `\n${trimmed}\n`;
            } else {
                const name = getInkIdentifier(content, `stitch_${i}`);
                result += `\n= ${name}\n`;
                result += `${trimmed}\n`;
            }
        } else if (isWeaveDepth) {
            // Column 3+ -> Weave (Choices and Gathers)
            if (!hasManualMarker) {
                // If it's a sibling of a node that had children, it's a Gather
                // (Wait, the DAG structure tells us if it's a sibling of the parent or child)
                // In standard Lineage, if it's in this 'nodes' array, they are siblings.
                // If the FIRST node in this array is a choice, and this is NOT the first node,
                // and this node doesn't have its own children that make it a choice...
                // Actually, the simplest rule: nodes in Column 3+ are choices unless they start with '-'
                const marker = trimmed.startsWith('+') ? '+' : '*';
                prefix = marker.repeat(weaveLevel) + " ";
            }
        } else {
            // Homeless prose
            result += `${trimmed}\n`;
        }
        
        // Choice Terminal Protection
        const isChoice = hasManualMarker ? (trimmed.startsWith('*') || trimmed.startsWith('+')) : (isWeaveDepth);
        const hasChildren = node.children && node.children.length > 0;
        
        let suffix = "";
        if (isChoice && !hasChildren && !hasExplicitDivert) {
            suffix = " -> END";
        }

        if (prefix) {
            result += `${prefix}${trimmed}${suffix}\n`;
        } else if (depth > 1) {
             // If we already added the Knot/Stitch header above, don't repeat
             if (!trimmed.startsWith('===') && !trimmed.startsWith('=')) {
                result += `${trimmed}${suffix}\n`;
             }
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
