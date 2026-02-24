import { describe, it, expect } from 'vitest';
import { inkToAst } from './ast-parser';

describe('inkToAst', () => {
    it('should parse knots into root nodes', () => {
        const ink = '=== knot1 ===\nContent 1\n=== knot2 ===\nContent 2';
        const { tree } = inkToAst(ink);
        expect(tree).toHaveLength(2);
        expect(tree[0].content).toBe('# knot1');
        expect(tree[1].content).toBe('# knot2');
    });

    it('should parse stitches as children of knots', () => {
        const ink = '=== knot1 ===\n= stitch1\nContent';
        const { tree } = inkToAst(ink);
        expect(tree[0].children).toHaveLength(1);
        expect(tree[0].children[0].content).toBe('## stitch1');
    });

    it('should parse choices and maintain hierarchy', () => {
        const ink = '=== knot1 ===\n* Choice 1\n** Sub-choice 1\n* Choice 2';
        const { tree } = inkToAst(ink);
        const knot = tree[0];
        expect(knot.children).toHaveLength(2); // Choice 1 and Choice 2
        expect(knot.children[0].content).toBe('* Choice 1');
        expect(knot.children[0].children).toHaveLength(1);
        expect(knot.children[0].children[0].content).toBe('** Sub-choice 1');
    });

    it('should translate diverts into wikilinks', () => {
        const ink = '=== knot1 ===\n-> target_knot\n* Choice -> target.stitch';
        const { tree } = inkToAst(ink);
        // Divert after knot
        expect(tree[0].children[0].content).toBe('[[target_knot]]');
        // Divert in choice
        expect(tree[0].children[1].content).toBe('* Choice [[target#stitch]]');
    });
    
    it('should handle gathers correctly', () => {
        const ink = '=== knot1 ===\n* Choice 1\n- Gather 1\nContent';
        const { tree } = inkToAst(ink);
        expect(tree[0].children).toHaveLength(2); // Choice 1 and Gather 1
        expect(tree[0].children[1].content).toBe('- Gather 1');
    });

    it('should extract global logic', () => {
        const ink = 'VAR health = 100\nCONST name = "Daniel"\n=== knot1 ===\nContent';
        const { tree, logic } = inkToAst(ink);
        expect(logic).toContain('VAR health = 100');
        expect(logic).toContain('CONST name = "Daniel"');
        expect(tree).toHaveLength(1);
    });
});
