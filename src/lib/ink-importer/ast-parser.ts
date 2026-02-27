import { TreeNode } from 'src/lib/data-conversion/x-to-json/columns-to-json';

/**
 * Parses Ink text content into a TreeNode structure compatible with Lineage.
 *
 * Strategy: Two-pass approach.
 *   Pass 1 — Separate preamble logic (everything before the first knot/stitch/choice)
 *            from the body.
 *   Pass 2 — Walk the body lines, building the tree:
 *            - `=== name ===`  → Knot (column 1, depth 0)
 *            - `= name`        → Stitch (column 2, depth 1)
 *            - `*`, `+`, `-`   → Weave choices and gathers (depth 2+)
 *            - Everything else  → Prose appended to the current node.
 *
 * Unlike the old parser, inline comments, conditionals, variable mutations
 * (`~ x = y`), and flow control (`->`, `<>`) are preserved verbatim as
 * prose within the containing node.  Only the *preamble* (VAR, CONST, LIST,
 * `=== function`, and any comments/blanks that precede the first structural
 * marker) is extracted into `logic`.
 */
export function inkToAst(ink: string): { tree: TreeNode[]; logic: string } {
    const lines = ink.split('\n');

    // ── Pass 1: Find the preamble boundary ──────────────────────────────
    // The preamble is every line before the first non-function knot
    // (`=== name ===`).  Everything else before that point — VARs, CONSTs,
    // `=== function` blocks, `{DEBUG:}` conditionals with choices, comments,
    // blank lines — all belong to the preamble.
    let preambleEnd = 0;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        // A non-function knot marks the start of the story body
        // Match both `=== name ===` and `=== name` (no trailing ===)
        const isStoryKnot = /^===\s+(?!function\b)(\S+)/.test(trimmed);
        if (isStoryKnot) {
            preambleEnd = i;
            break;
        }

        // If we reach the end without finding a knot, everything is preamble
        preambleEnd = i + 1;
    }

    const preambleLines = lines.slice(0, preambleEnd);
    const bodyLines = lines.slice(preambleEnd);

    // Trim trailing blank lines from preamble
    while (preambleLines.length > 0 && preambleLines[preambleLines.length - 1].trim() === '') {
        preambleLines.pop();
    }

    const logic = preambleLines.join('\n').trim();

    // ── Pass 2: Parse body into tree ────────────────────────────────────
    const roots: TreeNode[] = [];
    let currentKnot: TreeNode | null = null;
    let currentStitch: TreeNode | null = null;
    let weaveStack: { node: TreeNode; depth: number }[] = [];
    let currentNode: TreeNode | null = null;

    for (let i = 0; i < bodyLines.length; i++) {
        const line = bodyLines[i];
        const trimmed = line.trim();

        // ── Knot ────────────────────────────────────────────────────────
        // Match both `=== name ===` and `=== name` (no trailing ===)
        const knotMatch = trimmed.match(/^===\s+(?!function\b)(\S+)/);
        if (knotMatch) {
            const name = knotMatch[1].replace(/\s*=+$/, '').trim();
            const node: TreeNode = { content: `# ${name}`, children: [] };
            roots.push(node);
            currentKnot = node;
            currentStitch = null;
            weaveStack = [];
            currentNode = node;
            continue;
        }

        // ── Stitch ──────────────────────────────────────────────────────
        const stitchMatch = trimmed.match(/^=\s+([^=].*)$/);
        if (stitchMatch) {
            const name = stitchMatch[1].trim();
            const node: TreeNode = { content: `## ${name}`, children: [] };
            if (currentKnot) currentKnot.children.push(node);
            else roots.push(node);
            currentStitch = node;
            weaveStack = [];
            currentNode = node;
            continue;
        }

        // ── Choice / Gather ─────────────────────────────────────────────
        // Ink uses space-separated markers: * * (depth 2), - - (depth 2), etc.
        const weaveMatch = trimmed.match(/^([\*\+](?:\s*[\*\+])*|-(?!>)(?:\s*-(?!>))*)\s+(.*)$/);
        if (weaveMatch) {
            const rawMarkers = weaveMatch[1];
            const content = weaveMatch[2].trim();
            // Depth = number of marker characters, ignoring whitespace
            const strippedMarkers = rawMarkers.replace(/\s/g, '');
            const depth = strippedMarkers.length;
            const isGather = strippedMarkers.startsWith('-');

            const node: TreeNode = {
                content: strippedMarkers + ' ' + content,
                children: [],
            };

            if (isGather) {
                const pStack = weaveStack.filter((s) => s.depth < depth);
                const parent =
                    pStack.length > 0
                        ? pStack[pStack.length - 1].node
                        : currentStitch || currentKnot || roots[roots.length - 1];
                if (parent) parent.children.push(node);
                else roots.push(node);
                weaveStack = weaveStack.filter((s) => s.depth < depth);
            } else {
                let parent: TreeNode;
                if (depth === 1) {
                    parent =
                        currentStitch ||
                        currentKnot ||
                        roots[roots.length - 1];
                } else {
                    const pStack = weaveStack.filter((s) => s.depth < depth);
                    parent =
                        pStack.length > 0
                            ? pStack[pStack.length - 1].node
                            : currentStitch ||
                              currentKnot ||
                              roots[roots.length - 1];
                }
                if (parent) parent.children.push(node);
                else roots.push(node);
                weaveStack = weaveStack.filter((s) => s.depth < depth);
                weaveStack.push({ node, depth });
            }
            currentNode = node;
            continue;
        }

        // ── Prose / everything else ─────────────────────────────────────
        // Preserve inline logic (~, {}, //, ->, <>) verbatim
        if (trimmed && currentNode) {
            currentNode.content += '\n' + line;
        } else if (trimmed && !currentNode) {
            // Homeless prose before any structural marker → new root
            const node: TreeNode = { content: line, children: [] };
            roots.push(node);
            currentNode = node;
        } else if (!trimmed && currentNode) {
            // Blank line: preserve paragraph spacing
            currentNode.content += '\n';
        }
    }

    return { tree: roots, logic };
}
