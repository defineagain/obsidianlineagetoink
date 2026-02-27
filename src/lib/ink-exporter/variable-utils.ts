export type VariableType = 'VAR' | 'CONST';

export interface InkVariable {
    type: VariableType;
    name: string;
    value: string;
}

export interface VariableRef {
    fullMatch: string;
    varName: string;
    expression: string;
}

export interface VariableValidationResult {
    isValid: boolean;
    message: string;
    type: 'success' | 'warning' | 'error';
}

/**
 * Parses global variables and functions from the story-logic: frontmatter block.
 */
export function parseGlobalVariables(frontmatter: string): { vars: InkVariable[]; funcs: string } {
    const logicMatch = frontmatter.match(/story-logic: \|([\s\S]+?)(?=\n[a-z0-9-]+:|$)/);
    if (!logicMatch) return { vars: [], funcs: '' };

    const raw = logicMatch[1].split('\n').map(line => line.replace(/^  /, '')).join('\n').trim();
    const vars: InkVariable[] = [];
    const funcLines: string[] = [];
    let inFunc = false;

    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        
        // Match VAR/CONST assignments
        const varMatch = trimmed.match(/^(VAR|CONST)\s+(\w+)\s*=\s*(.+)$/);
        if (varMatch) {
            vars.push({ 
                type: varMatch[1] as VariableType, 
                name: varMatch[2], 
                value: varMatch[3].trim() 
            });
            continue;
        }

        // Match LIST declarations
        if (trimmed.startsWith('LIST ')) {
            const listMatch = trimmed.match(/^LIST\s+(\w+)\s*=\s*(.+)$/);
            if (listMatch) {
                vars.push({ 
                    type: 'VAR', 
                    name: `LIST ${listMatch[1]}`, 
                    value: listMatch[2].trim() 
                });
            }
            continue;
        }

        // Match Functions
        if (trimmed.startsWith('=== function') || inFunc) {
            inFunc = true;
            funcLines.push(line);
            // End function block on blank line if it's not the start
            if (funcLines.length > 1 && !trimmed) {
                inFunc = false;
            }
            continue;
        }

        if (trimmed) {
            funcLines.push(line);
        }
    }

    return { vars, funcs: funcLines.join('\n').trim() };
}

/**
 * Extracts all {variable} references from a card's content.
 */
export function extractLocalVariables(content: string): VariableRef[] {
    const refs: VariableRef[] = [];
    const seen = new Set<string>();

    // Pattern 1: {variable} conditionals
    const braceRegex = /\{([^}]+)\}/g;
    let match;
    while ((match = braceRegex.exec(content)) !== null) {
        const inner = match[1].trim();
        // Extract the root variable name from complex expressions:
        // {score > 0: Win|Loss} -> score
        // {name} -> name
        const varName = inner.split(/[ \:\>\<\!\=\|]/)[0].trim();
        if (varName && /^[a-zA-Z_]\w*$/.test(varName) && !seen.has(varName)) {
            refs.push({ fullMatch: match[0], varName, expression: inner });
            seen.add(varName);
        }
    }

    // Pattern 2: ~ variable = expression (Ink mutations)
    const tildeRegex = /~\s*(\w+)\s*=/g;
    while ((match = tildeRegex.exec(content)) !== null) {
        const varName = match[1].trim();
        if (varName && /^[a-zA-Z_]\w*$/.test(varName) && !seen.has(varName)) {
            refs.push({ fullMatch: match[0], varName, expression: `~ ${varName} = ...` });
            seen.add(varName);
        }
    }

    // Pattern 3: ~ function_call(args) (Ink function calls — extract function name as ref)
    const funcCallRegex = /~\s*(\w+)\s*\(/g;
    while ((match = funcCallRegex.exec(content)) !== null) {
        const funcName = match[1].trim();
        if (funcName && /^[a-zA-Z_]\w*$/.test(funcName) && !seen.has(funcName)) {
            refs.push({ fullMatch: match[0], varName: funcName, expression: `~ ${funcName}(...)` });
            seen.add(funcName);
        }
    }

    return refs;
}

/**
 * Scans all cards in the provided content map and returns a unique list of all variable names used.
 */
export function aggregateAllUsedVariables(contentMap: Record<string, { content: string }>): string[] {
    const allVars = new Set<string>();
    for (const nodeId in contentMap) {
        const refs = extractLocalVariables(contentMap[nodeId].content);
        for (const ref of refs) {
            allVars.add(ref.varName);
        }
    }
    return Array.from(allVars);
}

/**
 * Validates a local variable reference against a list of known global variable names.
 */
export function validateVariableRef(ref: VariableRef, globals: string[]): VariableValidationResult {
    const { varName, expression } = ref;

    // 1. Definition check
    if (!globals.includes(varName)) {
        return {
            isValid: false,
            message: `Variable '${varName}' is not defined in story-logic.`,
            type: 'warning'
        };
    }

    // 2. Basic syntax check for conditional results
    if (expression.includes(':')) {
        const parts = expression.split(':');
        const results = parts[1]?.trim();
        if (!results) {
            return {
                isValid: false,
                message: `Conditional expression expects results after ':'.`,
                type: 'error'
            };
        }
        if (results.includes('|') && results.split('|').length < 2) {
             return {
                isValid: false,
                message: `Multi-option results expect a '|' separator.`,
                type: 'warning'
            };
        }
    }

    return { isValid: true, message: 'Defined and valid syntax.', type: 'success' };
}

/**
 * Serializes a list of variables and a functions string into the story-logic frontmatter format.
 */
export function serializeGlobalVariables(vars: InkVariable[], funcs: string): string {
    const varLines = vars.map((v) => {
        if (v.name.startsWith('LIST ')) {
            return `${v.name} = ${v.value}`;
        }
        return `${v.type} ${v.name} = ${v.value}`;
    });
    const parts = [...varLines];
    if (funcs.trim()) {
        parts.push('', funcs.trim());
    }
    const logic = parts.join('\n').trim();
    if (!logic) return '';

    return `story-logic: |\n  ${logic.replace(/\n/g, '\n  ')}`;
}

/**
 * Updates an existing global variable's value in the frontmatter string.
 */
export function updateGlobalVariableInFM(
    fm: string,
    varName: string,
    newValue: string,
): string {
    const parsed = parseGlobalVariables(fm);
    const updatedVars = parsed.vars.map((v) =>
        v.name === varName ? { ...v, value: newValue } : v,
    );
    const newLogicBlock = serializeGlobalVariables(updatedVars, parsed.funcs);

    if (fm.includes('story-logic: |')) {
        return fm.replace(
            /story-logic: \|[\s\S]+?(?=\n[a-z0-9-]+:|$)/,
            newLogicBlock,
        );
    }
    return fm;
}

/**
 * Adds a new global variable declaration to the frontmatter string.
 */
export function addGlobalVariableToFM(
    fm: string,
    varName: string,
    type: VariableType = 'VAR',
    value: string = '0',
): string {
    const parsed = parseGlobalVariables(fm);
    // Avoid duplicates
    if (parsed.vars.some((v) => v.name === varName)) return fm;

    // Prepend to the beginning of the variables list
    const updatedVars = [{ type, name: varName, value }, ...parsed.vars];
    const newLogicBlock = serializeGlobalVariables(updatedVars, parsed.funcs);

    if (fm.includes('story-logic: |')) {
        return fm.replace(
            /story-logic: \|[\s\S]+?(?=\n[a-z0-9-]+:|$)/,
            newLogicBlock,
        );
    } else {
        // Append logic-block before the closing --- or at the end
        const block = `---\n${newLogicBlock}\n---`;
        if (fm.trim() === '' || fm.trim() === '---') return block;
        return fm.replace(/(?=\n---)/, `\n${newLogicBlock}`);
    }
}

// ── Ink-Native Logic Parsing ─────────────────────────────────────────────────

/**
 * Parses global variables and functions from the raw Ink preamble (inkLogic).
 * Unlike parseGlobalVariables, this reads directly from Ink source, not YAML.
 */
export function parseInkLogicVariables(inkLogic: string): { vars: InkVariable[]; funcs: string } {
    if (!inkLogic || !inkLogic.trim()) return { vars: [], funcs: '' };

    const vars: InkVariable[] = [];
    const funcLines: string[] = [];
    let inFunc = false;

    for (const line of inkLogic.split('\n')) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;
        if (trimmed.startsWith('*') && trimmed.endsWith('*/')) continue;

        // Match VAR/CONST assignments (with optional trailing comment)
        const varMatch = trimmed.match(/^(VAR|CONST)\s+(\w+)\s*=\s*(.+?)(?:\s*\/\/.*)?$/);
        if (varMatch) {
            vars.push({
                type: varMatch[1] as VariableType,
                name: varMatch[2],
                value: varMatch[3].trim(),
            });
            continue;
        }

        // Match LIST declarations
        if (trimmed.startsWith('LIST ')) {
            const listMatch = trimmed.match(/^LIST\s+(\w+)\s*=\s*(.+?)(?:\s*\/\/.*)?$/);
            if (listMatch) {
                vars.push({
                    type: 'VAR',
                    name: `LIST ${listMatch[1]}`,
                    value: listMatch[2].trim(),
                });
            }
            continue;
        }

        // Track function blocks
        if (trimmed.startsWith('=== function') || inFunc) {
            inFunc = true;
            funcLines.push(line);
            // End function on blank line (if not the start)
            if (funcLines.length > 1 && !trimmed) {
                inFunc = false;
            }
            continue;
        }
    }

    return { vars, funcs: funcLines.join('\n').trim() };
}

/**
 * Updates a variable's value directly in the raw Ink preamble string.
 */
export function updateVariableInInkLogic(
    inkLogic: string,
    varName: string,
    newValue: string,
): string {
    // Match VAR/CONST declarations with optional trailing comment
    const regex = new RegExp(
        `^((?:VAR|CONST)\\s+${varName}\\s*=\\s*).+?(\\s*\\/\\/.*)?$`,
        'm',
    );
    return inkLogic.replace(regex, `$1${newValue}$2`);
}

/**
 * Adds a new variable declaration to the raw Ink preamble string.
 * Inserts after the last existing VAR/CONST line.
 */
export function addVariableToInkLogic(
    inkLogic: string,
    varName: string,
    type: VariableType = 'VAR',
    value: string = '0',
): string {
    // Check for duplicates
    if (new RegExp(`^(?:VAR|CONST)\\s+${varName}\\s*=`, 'm').test(inkLogic)) {
        return inkLogic;
    }

    const newLine = `${type} ${varName} = ${value}`;
    const lines = inkLogic.split('\n');

    // Prepend to the very top (start of the adventure)
    lines.unshift(newLine);

    return lines.join('\n');
}

