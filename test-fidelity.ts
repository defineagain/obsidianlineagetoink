import * as fs from 'fs';
import { inkToAst } from './src/lib/ink-importer/ast-parser';
import { astToInk } from './src/lib/ink-exporter/ast-parser';

async function runTest() {
    const inputPath = '/Users/daniel/Documents/obsidian-plugin-sandbox/obsidianstoryboardcanvas/obsidianlineagetoink/obsidianlineagetoink/TheIntercept.ink';
    const outputPath = '/Users/daniel/Documents/obsidian-plugin-sandbox/obsidianstoryboardcanvas/obsidianlineagetoink/obsidianlineagetoink/TheIntercept (3).ink';
    
    console.log('Reading original Ink file...');
    const originalInk = fs.readFileSync(inputPath, 'utf8');
    
    console.log('Parsing Ink to AST...');
    const { tree, logic } = inkToAst(originalInk);
    
    console.log('Serializing AST back to Ink...');
    // Simulated behavior: In the real app, "logic" goes to frontmatter.
    // Here we'll just prepend it to the exported Ink to match the original structure.
    let exportedInk = astToInk(tree, 0);
    
    // Combine logic and content
    const finalOutput = logic + "\n" + exportedInk;
    
    fs.writeFileSync(outputPath, finalOutput);
    console.log('Exported to TheIntercept (3).ink');
    console.log('Please run: diff -u TheIntercept.ink "TheIntercept (3).ink"');
}

runTest().catch(console.error);
