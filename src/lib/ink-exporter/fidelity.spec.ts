import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import { inkToAst } from '../ink-importer/ast-parser';
import { astToInk } from './ast-parser';

describe('Ink Import/Export Fidelity', () => {
    it('should maintain structure for TheIntercept.ink', () => {
        const inputPath = '/Users/daniel/Documents/obsidian-plugin-sandbox/obsidianstoryboardcanvas/obsidianlineagetoink/obsidianlineagetoink/TheIntercept.ink';
        const originalInk = fs.readFileSync(inputPath, 'utf8');
        
        const { tree, logic } = inkToAst(originalInk);
        const exportedBody = astToInk(tree, 0);
        const finalOutput = logic + "\n" + exportedBody;
        
        // Write it out for manual inspection if needed
        fs.writeFileSync('/Users/daniel/Documents/obsidian-plugin-sandbox/obsidianstoryboardcanvas/obsidianlineagetoink/obsidianlineagetoink/TheIntercept (Test).ink', finalOutput);
        
        // Check for specific previous failures
        expect(finalOutput).not.toContain('=== _they_are_keeping_me_waiting');
        expect(finalOutput).toContain('// Character variables.');
        expect(finalOutput).toContain('-> END');
        expect(finalOutput).not.toContain('-> end');
    });
});
