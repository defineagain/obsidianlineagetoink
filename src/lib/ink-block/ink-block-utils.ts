/**
 * Utilities for managing fenced Ink blocks inside Markdown files.
 *
 * A fenced Ink block looks like:
 * ```ink
 * VAR x = 0
 * === start ===
 * Hello world
 * ```
 *
 * The markdown file can have arbitrary content before (preamble)
 * and after (postamble) the fenced Ink block.
 */

const INK_FENCE_OPEN = /^```ink\s*$/m;
const INK_FENCE_CLOSE = /^```\s*$/m;

/**
 * Patterns that strongly indicate raw Ink content (unfenced).
 * We require at least 2 distinct marker types to avoid false positives.
 */
const INK_KNOT = /^===\s*\w+.*===\s*$/m;
const INK_VAR = /^\s*(VAR|CONST|LIST)\s+\w+/m;
const INK_CHOICE = /^\s*[\*\+]\s+/m;
const INK_DIVERT = /->\s*\w+/m;
const INK_STITCH = /^=\s+\w+/m;

export interface InkBlock {
    /** Markdown content before the ```ink fence */
    preamble: string;
    /** The raw Ink source (without the fence markers) */
    inkSource: string;
    /** Markdown content after the closing ``` fence */
    postamble: string;
}

/**
 * Extracts the Ink source from a fenced ```ink block inside a markdown string.
 * Returns null if no fenced Ink block is found.
 */
export function extractInkBlock(markdown: string): InkBlock | null {
    const openMatch = INK_FENCE_OPEN.exec(markdown);
    if (!openMatch) return null;

    const openEnd = openMatch.index + openMatch[0].length;
    const afterOpen = markdown.slice(openEnd);

    // Find the closing fence. We need to be careful to match the *first*
    // closing ``` that appears after the opening fence.
    const closeMatch = INK_FENCE_CLOSE.exec(afterOpen);
    if (!closeMatch) return null;

    const preamble = markdown.slice(0, openMatch.index);
    const inkSource = afterOpen.slice(0, closeMatch.index);
    const postamble = afterOpen.slice(closeMatch.index + closeMatch[0].length);

    return {
        preamble,
        inkSource: inkSource.replace(/^\n/, '').replace(/\n$/, ''),
        postamble,
    };
}

/**
 * Recomposes a markdown file by injecting the Ink source into a fenced block.
 */
export function injectInkBlock(
    preamble: string,
    inkSource: string,
    postamble: string,
): string {
    const trimmedPreamble = preamble.replace(/\n+$/, '');
    const trimmedPostamble = postamble.replace(/^\n+/, '');
    const parts: string[] = [];

    if (trimmedPreamble) {
        parts.push(trimmedPreamble);
        parts.push('');
    }

    parts.push('```ink');
    parts.push(inkSource);
    parts.push('```');

    if (trimmedPostamble) {
        parts.push('');
        parts.push(trimmedPostamble);
    }

    return parts.join('\n') + '\n';
}

/**
 * Returns true if the markdown string contains a fenced Ink block
 * OR if it appears to be raw (unfenced) Ink content.
 */
export function isInkDocument(markdown: string): boolean {
    if (INK_FENCE_OPEN.test(markdown)) return true;
    return isRawInk(markdown);
}

/**
 * Detects raw (unfenced) Ink content by checking for multiple
 * structural markers. Requires at least 2 distinct marker types
 * to avoid false positives with regular markdown.
 */
export function isRawInk(text: string): boolean {
    let markers = 0;
    if (INK_KNOT.test(text)) markers++;
    if (INK_VAR.test(text)) markers++;
    if (INK_CHOICE.test(text)) markers++;
    if (INK_DIVERT.test(text)) markers++;
    if (INK_STITCH.test(text)) markers++;
    return markers >= 2;
}
