import { describe, it, expect } from 'vitest';
import {
    extractInkBlock,
    injectInkBlock,
    isInkDocument,
} from './ink-block-utils';

describe('ink-block-utils', () => {
    describe('extractInkBlock', () => {
        it('should extract ink from a simple fenced block', () => {
            const md = [
                '```ink',
                'VAR x = 0',
                '=== start ===',
                'Hello world',
                '```',
            ].join('\n');

            const result = extractInkBlock(md);
            expect(result).not.toBeNull();
            expect(result!.preamble).toBe('');
            expect(result!.inkSource).toBe(
                'VAR x = 0\n=== start ===\nHello world',
            );
            expect(result!.postamble).toBe('');
        });

        it('should preserve preamble and postamble', () => {
            const md = [
                '---',
                'title: My Story',
                '---',
                '',
                '```ink',
                '=== start ===',
                'Hello',
                '```',
                '',
                'Some notes after the story.',
            ].join('\n');

            const result = extractInkBlock(md);
            expect(result).not.toBeNull();
            expect(result!.preamble).toBe('---\ntitle: My Story\n---\n\n');
            expect(result!.inkSource).toBe('=== start ===\nHello');
            expect(result!.postamble).toBe('\n\nSome notes after the story.');
        });

        it('should return null if no ink block exists', () => {
            const md = '# Just a normal markdown file\n\nSome content.';
            expect(extractInkBlock(md)).toBeNull();
        });

        it('should return null if the block is not closed', () => {
            const md = '```ink\nVAR x = 0\n=== start ===';
            expect(extractInkBlock(md)).toBeNull();
        });
    });

    describe('injectInkBlock', () => {
        it('should create a clean document with no preamble/postamble', () => {
            const result = injectInkBlock('', 'VAR x = 0\n=== start ===\nHello', '');
            expect(result).toBe('```ink\nVAR x = 0\n=== start ===\nHello\n```\n');
        });

        it('should include preamble and postamble', () => {
            const result = injectInkBlock(
                '---\ntitle: My Story\n---\n',
                '=== start ===\nHello',
                '\nSome notes.',
            );
            expect(result).toContain('---\ntitle: My Story\n---');
            expect(result).toContain('```ink');
            expect(result).toContain('=== start ===\nHello');
            expect(result).toContain('```');
            expect(result).toContain('Some notes.');
        });
    });

    describe('isInkDocument', () => {
        it('should return true for a document with an ink block', () => {
            const md = '```ink\nHello\n```';
            expect(isInkDocument(md)).toBe(true);
        });

        it('should return false for a regular markdown document', () => {
            const md = '# Hello\nWorld';
            expect(isInkDocument(md)).toBe(false);
        });

        it('should return false for a non-ink code block', () => {
            const md = '```javascript\nconsole.log("hi")\n```';
            expect(isInkDocument(md)).toBe(false);
        });
    });

    describe('round-trip', () => {
        it('should preserve content through extract -> inject', () => {
            const original = [
                '---',
                'title: Test',
                '---',
                '',
                '```ink',
                'VAR courage = 0',
                '',
                '=== start ===',
                'You stand at the crossroads.',
                '* Go left -> left_path',
                '* Go right -> right_path',
                '```',
                '',
                'Author notes here.',
            ].join('\n');

            const block = extractInkBlock(original);
            expect(block).not.toBeNull();

            const reconstructed = injectInkBlock(
                block!.preamble,
                block!.inkSource,
                block!.postamble,
            );

            // Re-extract to verify
            const block2 = extractInkBlock(reconstructed);
            expect(block2).not.toBeNull();
            expect(block2!.inkSource).toBe(block!.inkSource);
        });
    });
});
