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
    
    // Weave nesting level starts at depth 2 (Column 3)
    const weaveLevel = Math.max(1, depth - 1);
    
    // If there are multiple nodes in this array and depth >= 2, they represent branching choices
    // from the parent column.
    const isBranchingChoices = nodes.length > 1 && depth > 1;

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        let content = translateLinks(node.content);
        let prefix = "";
        
        const trimmed = content.trim();
        const hasManualMarker = trimmed.startsWith('*') || trimmed.startsWith('+') || trimmed.startsWith('-');
        const hasExplicitDivert = content.includes('->');

        if (depth === 0) {
            // Column 1 -> ALWAYS a Knot
            if (trimmed.startsWith('===')) {
                result += `\n${content}\n`;
            } else {
                const name = getInkIdentifier(content, `knot_${i}`);
                result += `\n=== ${name} ===\n`;
                result += `${content}\n`;
            }
        } else if (depth === 1) {
            // Column 2 -> ALWAYS a Stitch
            if (trimmed.startsWith('=')) {
                result += `\n${content}\n`;
            } else {
                const name = getInkIdentifier(content, `stitch_${i}`);
                result += `\n= ${name}\n`;
                result += `${content}\n`;
            }
        } else {
            // Column 3+ -> Weave (Choices and Gathers)
            if (isBranchingChoices && !hasManualMarker) {
                // Determine if parent was explicitly marked sticky via a '+' sign
                // (Note: This logic might need refinement depending on where sticky state is stored)
                const isSticky = trimmed.startsWith('+');
                const marker = isSticky ? '+' : '*';
                prefix = marker.repeat(weaveLevel) + " ";
            } else if (i > 0 && !hasManualMarker) {
                // Sibling strictly below another node -> Gather
                prefix = "-".repeat(weaveLevel) + " ";
            }
        }
        
        // Choice Terminal Protection: 
        // If this is a choice (*) or sticky choice (+) and has no children, 
        // it MUST end in a divert or it will hang in Ink.
        const isChoice = hasManualMarker && (trimmed.startsWith('*') || trimmed.startsWith('+'));
        const hasChildren = node.children && node.children.length > 0;
        
        let suffix = "";
        if (isChoice && !hasChildren && !hasExplicitDivert) {
            suffix = " -> END";
        }

        result += `${prefix}${content.trim()}${suffix}\n`;
        
        if (hasChildren) {
            // Automation: If this is a Knot (depth 0) or Stitch (depth 1) and has children,
            // and it doesn't already have a divert (->), add one to the first child
            if (depth < 2 && !hasExplicitDivert) {
                const firstChild = node.children[0];
                const firstChildName = getInkIdentifier(firstChild.content, `child_${i}`);
                result += `-> ${firstChildName}\n`;
            }
            result += astToInk(node.children, depth + 1);
        }
    }
    
    return result;
};
