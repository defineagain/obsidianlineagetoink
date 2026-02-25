import { describe, it, expect } from 'vitest';
import { inkToAst } from './ast-parser';

describe('inkToAst', () => {
    it('should parse knots into root nodes with aggregated content', () => {
        const ink = '=== knot1 ===\nContent 1\n=== knot2 ===\nContent 2';
        const { tree } = inkToAst(ink);
        expect(tree).toHaveLength(2);
        // Beat Aggregation: prose after knot header is appended to the knot body
        expect(tree[0].content).toContain('# knot1');
        expect(tree[0].content).toContain('Content 1');
        expect(tree[1].content).toContain('# knot2');
        expect(tree[1].content).toContain('Content 2');
    });

    it('should parse stitches as children of knots with aggregated content', () => {
        const ink = '=== knot1 ===\n= stitch1\nContent';
        const { tree } = inkToAst(ink);
        expect(tree[0].children).toHaveLength(1);
        // Beat Aggregation: prose after stitch header is appended to the stitch body
        expect(tree[0].children[0].content).toContain('## stitch1');
        expect(tree[0].children[0].content).toContain('Content');
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
        // Beat Aggregation: inline divert after knot is aggregated into knot body
        expect(tree[0].content).toContain('[[target_knot]]');
        // Divert in choice remains a child
        expect(tree[0].children[0].content).toBe('* Choice [[target#stitch]]');
    });
    
    it('should handle gathers with aggregated content', () => {
        const ink = '=== knot1 ===\n* Choice 1\n- Gather 1\nContent';
        const { tree } = inkToAst(ink);
        expect(tree[0].children).toHaveLength(2); // Choice 1 and Gather 1
        // Beat Aggregation: prose after gather is appended to the gather body
        expect(tree[0].children[1].content).toContain('- Gather 1');
        expect(tree[0].children[1].content).toContain('Content');
    });

    it('should extract global logic', () => {
        const ink = 'VAR health = 100\nCONST name = "Daniel"\n=== knot1 ===\nContent';
        const { tree, logic } = inkToAst(ink);
        expect(logic).toContain('VAR health = 100');
        expect(logic).toContain('CONST name = "Daniel"');
        expect(tree).toHaveLength(1);
    });

    it('should preserve blank lines within a beat (paragraph spacing)', () => {
        const ink = '=== knot1 ===\nLine one.\n\nLine two after blank.';
        const { tree } = inkToAst(ink);
        expect(tree[0].content).toContain('Line one.');
        expect(tree[0].content).toContain('Line two after blank.');
    });

    it('should round-trip: import then export preserves structure', () => {
        const ink = 'VAR health = 100\n\n=== start ===\nHello world.\n* Choice A\n* Choice B\n- Gather point';
        const { tree, logic } = inkToAst(ink);
        
        // Verify import
        expect(tree).toHaveLength(1);
        expect(tree[0].content).toContain('start');
        expect(logic).toContain('VAR health = 100');
        
        // Verify children exist (choices + gather)
        expect(tree[0].children.length).toBeGreaterThanOrEqual(2);
    });
});
