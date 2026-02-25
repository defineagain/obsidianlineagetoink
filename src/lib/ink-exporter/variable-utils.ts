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
    const regex = /\{([^}]+)\}/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const inner = match[1].trim();
        // Extract the root variable name from complex expressions:
        // {score > 0: Win|Loss} -> score
        // {name} -> name
        const varName = inner.split(/[ \:\>\<\!\=\|]/)[0].trim();
        if (varName && /^[a-zA-Z_]\w*$/.test(varName)) {
            refs.push({ fullMatch: match[0], varName, expression: inner });
        }
    }
    return refs;
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

    return {
        isValid: true,
        message: 'Defined and valid syntax.',
        type: 'success'
    };
}
