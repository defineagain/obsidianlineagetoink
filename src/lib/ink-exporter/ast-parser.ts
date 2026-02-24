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

function getHeaderName(text: string, fallback: string): string {
    const match = text.match(/^#+\s+(.*)$/m);
    if (match) {
        return match[1].trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    }
    return fallback;
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
        
        if (depth === 0) {
            // Column 1 -> Knot
            if (content.trim().startsWith('===')) {
                result += `\n${content}\n`;
            } else {
                const name = getHeaderName(content, `knot_${Date.now()}_${i}`);
                result += `\n=== ${name} ===\n`;
                result += `${content}\n`;
            }
        } else if (depth === 1) {
            // Column 2 -> Stitch
            if (content.trim().startsWith('=')) {
                result += `\n${content}\n`;
            } else {
                const name = getHeaderName(content, `stitch_${Date.now()}_${i}`);
                result += `\n= ${name}\n`;
                result += `${content}\n`;
            }
        } else {
            // Column 3+ -> Weave (Choices and Gathers)
            let prefix = "";
            const trimmed = content.trim();
            const hasManualMarker = trimmed.startsWith('*') || trimmed.startsWith('+') || trimmed.startsWith('-');
            
            if (isBranchingChoices && !hasManualMarker) {
                // Explicitly marked sticky choice via a '+' sign
                const isSticky = content.trim().startsWith('+');
                const marker = isSticky ? '+' : '*';
                if (isSticky) {
                    content = content.trim().substring(1).trim();
                }
                prefix = marker.repeat(weaveLevel) + " ";
            } else if (i > 0 && !hasManualMarker) {
                // If it's a sibling strictly below another node in the same column, it's a Gather
                prefix = "-".repeat(weaveLevel) + " ";
            }
            
            result += `${prefix}${content}\n`;
        }
        
        if (node.children && node.children.length > 0) {
            // Automation: If this is a Knot (depth 0) or Stitch (depth 1) and has children,
            // and it doesn't already have a divert (->), add one to the first child
            if (depth < 2 && !content.includes('->')) {
                const firstChild = node.children[0];
                const firstChildName = getHeaderName(firstChild.content, `child_${Date.now()}`);
                result += `-> ${firstChildName}\n`;
            }
            result += astToInk(node.children, depth + 1);
        }
    }
    
    return result;
};
