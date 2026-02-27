const { Compiler } = require('inkjs');
const fs = require('fs');
const path = require('path');

const inkPath = path.join(__dirname, 'TheIntercept.ink');
const inkContent = fs.readFileSync(inkPath, 'utf8');

try {
    console.log("Attempting to compile TheIntercept.ink...");
    const compiler = new Compiler(inkContent);
    const story = compiler.Compile();
    console.log("Compilation successful!");
} catch (err) {
    console.error("Compilation failed:");
    console.error(err);
}
