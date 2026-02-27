
const { Compiler } = require('./node_modules/inkjs/dist/ink-full.js');

const ink = `
VAR x = 0
~ x = 1
~ f()

== function f()
    ~ return
`;

try {
    console.log("Compiling...");
    const compiler = new Compiler(ink);
    const story = compiler.Compile();
    console.log("Success!");
} catch (err) {
    console.error("Caught error:");
    console.error(err);
    if (err.stack) console.error(err.stack);
}
