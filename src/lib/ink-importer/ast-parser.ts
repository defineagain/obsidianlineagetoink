import { TreeNode } from 'src/lib/data-conversion/x-to-json/columns-to-json';

/**
 * Parses Ink text content into a TreeNode structure compatible with Lineage.
 * Mapping Rules:
 * - story-logic (frontmatter): Global VAR, CONST, and functions
 * - Column 1 (Depth 0): Knots (=== knot_name ===)
 * - Column 2 (Depth 1): Stitches (= stitch_name)
 * - Column 3+ (Depth 2+): Choice branches (*, +) and gathers (-)
 */
export function inkToAst(ink: string): { tree: TreeNode[], logic: string } {
    const lines = ink.split('\n');
    const roots: TreeNode[] = [];
    let storyLogic = "";
    
    let currentKnot: TreeNode | null = null;
    let currentStitch: TreeNode | null = null;
    let weaveStack: { node: TreeNode; depth: number }[] = [];
    let currentNode: TreeNode | null = null;
    
    let inLogicBlock = false;

    const flushBuffer = (nextLineTrimmed: string) => {
        // No-op if no current node or if we are just starting
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // 1. Logic Block Detection (unchanged context)
        const isVAR = trimmed.startsWith('VAR ');
        const isCONST = trimmed.startsWith('CONST ');
        const isLIST = trimmed.startsWith('LIST ');
        const isFunction = trimmed.match(/^===\s*function\b/);

        if ((isVAR || isCONST || isLIST || isFunction || (!currentKnot && !trimmed)) && 
            !trimmed.match(/^([\*\+\-]+)\s/) && 
            !trimmed.match(/^=+\s*([^=].*)$/) && 
            !trimmed.match(/^===\s*(.*?)\s*===/)) {
            
            if (!trimmed.startsWith('->') || !currentKnot) {
                storyLogic += line + "\n";
                if (isFunction) inLogicBlock = true;
                continue;
            }
        }

        if (trimmed.match(/^=+\s*([^=].*)$/)) inLogicBlock = false;
        if (inLogicBlock) {
            storyLogic += line + "\n";
            continue;
        }

        // 2. Structural Controls (Hard Breaks)
        const knotMatch = trimmed.match(/^===\s*(.*?)\s*===/);
        const stitchMatch = trimmed.match(/^=\s*([^=].*)$/);
        const weaveMatch = trimmed.match(/^([\*\+]+|-+(?!>))\s*(.*)$/);

        if (knotMatch || stitchMatch || weaveMatch) {
            if (knotMatch) {
                const name = knotMatch[1].trim();
                const node: TreeNode = { content: `# ${name}`, children: [] };
                roots.push(node);
                currentKnot = node;
                currentStitch = null;
                weaveStack = [];
                currentNode = node;
            } else if (stitchMatch) {
                const name = stitchMatch[1].trim();
                const node: TreeNode = { content: `## ${name}`, children: [] };
                if (currentKnot) currentKnot.children.push(node);
                else roots.push(node);
                currentStitch = node;
                weaveStack = [];
                currentNode = node;
            } else if (weaveMatch) {
                const markers = weaveMatch[1];
                const content = weaveMatch[2].trim();
                const depth = markers.length;
                const isGather = markers.startsWith('-');

                const node: TreeNode = {
                    content: markers + " " + translateDiverts(content),
                    children: []
                };

                if (isGather) {
                    // Gather Logic: Sibling to the node that initiated the choices
                    // Find parent of the current weave level
                    const pStack = weaveStack.filter(s => s.depth < depth);
                    let parent = pStack.length > 0 ? pStack[pStack.length - 1].node : (currentStitch || currentKnot || roots[roots.length - 1]);
                    
                    if (parent) parent.children.push(node);
                    else roots.push(node);
                    
                    // Reset stack at this depth and deeper
                    weaveStack = weaveStack.filter(s => s.depth < depth);
                } else {
                    // Choice Logic: Nested child
                    let parent: TreeNode;
                    if (depth === 1) {
                        parent = currentStitch || currentKnot || roots[roots.length - 1];
                    } else {
                        const pStack = weaveStack.filter(s => s.depth < depth);
                        parent = pStack.length > 0 ? pStack[pStack.length - 1].node : (currentStitch || currentKnot || roots[roots.length - 1]);
                    }
                    if (parent) parent.children.push(node);
                    else roots.push(node);

                    weaveStack = weaveStack.filter(s => s.depth < depth);
                    weaveStack.push({ node, depth });
                }
                currentNode = node;
            }
            continue;
        }

        // 3. Beat Aggregation (Append prose to current node)
        if (trimmed && currentNode) {
            const contentToAppend = translateDiverts(line);
            if (currentNode.content.includes('\n') || currentNode.content.trim().length > 0) {
                currentNode.content += "\n" + contentToAppend;
            } else {
                currentNode.content += contentToAppend;
            }
        } else if (trimmed && !currentNode) {
            // Homeless prose (rare) -> New root node
            const node: TreeNode = { content: translateDiverts(line), children: [] };
            roots.push(node);
            currentNode = node;
        } else if (!trimmed && currentNode) {
            // Blank line within a beat: preserve paragraph spacing
            currentNode.content += "\n";
        }
    }

    return { tree: roots, logic: storyLogic.trim() };
}

function translateDiverts(text: string): string {
    return text.replace(/->\s*([a-zA-Z0-9_\.]+)/g, (match, target) => {
        const cleanTarget = target.replace(/\./g, '#');
        return `[[${cleanTarget}]]`;
    });
}
