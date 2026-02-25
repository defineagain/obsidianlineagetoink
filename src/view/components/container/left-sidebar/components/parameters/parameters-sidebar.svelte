<script lang="ts">
    import { getView } from 'src/view/components/container/context';
    import { onDestroy } from 'svelte';
    import { debounce } from 'obsidian';

    const view = getView();
    const documentStore = view.documentStore;

    type InkVariable = {
        type: 'VAR' | 'CONST';
        name: string;
        value: string;
    };

    let variables: InkVariable[] = [];
    let functions: string = '';
    let title = '';

    function parseLogicBlock(logic: string): { vars: InkVariable[]; funcs: string } {
        const vars: InkVariable[] = [];
        const funcLines: string[] = [];
        let inFunc = false;

        for (const line of logic.split('\n')) {
            const trimmed = line.trim();
            const varMatch = trimmed.match(/^(VAR|CONST)\s+(\w+)\s*=\s*(.+)$/);
            if (varMatch) {
                vars.push({ type: varMatch[1] as 'VAR' | 'CONST', name: varMatch[2], value: varMatch[3].trim() });
                continue;
            }
            if (trimmed.startsWith('=== function') || inFunc) {
                inFunc = true;
                funcLines.push(line);
                // A blank line or new knot ends the function block
                if (inFunc && funcLines.length > 1 && !trimmed) {
                    inFunc = false;
                }
                continue;
            }
            if (trimmed.startsWith('LIST ')) {
                // LIST treated as a VAR-like entry
                const listMatch = trimmed.match(/^LIST\s+(\w+)\s*=\s*(.+)$/);
                if (listMatch) {
                    vars.push({ type: 'VAR', name: `LIST ${listMatch[1]}`, value: listMatch[2].trim() });
                }
                continue;
            }
            if (trimmed) {
                funcLines.push(line);
            }
        }
        return { vars, funcs: funcLines.join('\n').trim() };
    }

    function serializeLogicBlock(vars: InkVariable[], funcs: string): string {
        const varLines = vars.map(v => {
            if (v.name.startsWith('LIST ')) {
                return `${v.name} = ${v.value}`;
            }
            return `${v.type} ${v.name} = ${v.value}`;
        });
        const parts = [...varLines];
        if (funcs.trim()) {
            parts.push('', funcs.trim());
        }
        return parts.join('\n');
    }

    // Subscribe to frontmatter changes
    const unsub = documentStore.subscribe((state) => {
        const fm = state.file.frontmatter;
        const logicMatch = fm.match(/story-logic: \|([\s\S]+?)(?=\n[a-z0-9-]+:|$)/);
        if (logicMatch) {
            const raw = logicMatch[1].split('\n').map((line: string) => line.replace(/^  /, '')).join('\n').trim();
            const parsed = parseLogicBlock(raw);
            variables = parsed.vars;
            functions = parsed.funcs;
        } else {
            variables = [];
            functions = '';
        }
        const titleMatch = fm.match(/^title:\s*(.*)$/m);
        if (titleMatch) {
            title = titleMatch[1].trim();
        }
    });

    onDestroy(() => {
        unsub();
    });

    const updateFrontmatter = debounce(() => {
        const state = documentStore.getValue();
        const currentFM = state.file.frontmatter;
        const logic = serializeLogicBlock(variables, functions);

        let newFM = currentFM;
        // Update Title
        if (newFM.match(/^title:.*$/m)) {
            newFM = newFM.replace(/^title:.*$/m, `title: ${title}`);
        } else {
            newFM = `title: ${title}\n` + newFM;
        }

        // Update Logic
        const logicKey = 'story-logic: |';
        const logicBlock = logic.trim()
            ? `${logicKey}\n  ${logic.trim().replace(/\n/g, '\n  ')}`
            : '';

        if (newFM.includes(logicKey)) {
            if (logicBlock) {
                newFM = newFM.replace(/story-logic: \|[\s\S]+?(?=\n[a-z0-9-]+:|$)/, logicBlock);
            } else {
                newFM = newFM.replace(/story-logic: \|[\s\S]+?(?=\n[a-z0-9-]+:|$)/, '');
            }
        } else if (logicBlock) {
            if (newFM.trim() === '') {
                newFM = `---\n${logicBlock}\n---`;
            } else {
                newFM = newFM.replace(/(?=\n---)/, `\n${logicBlock}`);
            }
        }

        if (newFM !== currentFM) {
            documentStore.dispatch({
                type: 'document/file/update-frontmatter',
                payload: {
                    frontmatter: newFM,
                },
            });
        }
    }, 500);

    function addVariable() {
        variables = [...variables, { type: 'VAR', name: 'new_var', value: '0' }];
        updateFrontmatter();
    }

    function removeVariable(index: number) {
        variables = variables.filter((_, i) => i !== index);
        updateFrontmatter();
    }
</script>

<div class="parameters-container">
    <div class="parameters-section">
        <label for="ink-title">Story Title</label>
        <input
            id="ink-title"
            type="text"
            bind:value={title}
            on:input={() => updateFrontmatter()}
            placeholder="Story Title..."
        />
    </div>

    <div class="parameters-section">
        <div class="parameters-header">
            <h3>Variables</h3>
            <span>Global VAR and CONST declarations</span>
        </div>
        <div class="variables-list">
            {#each variables as variable, i}
                <div class="variable-row">
                    <select class="var-type" bind:value={variable.type} on:change={() => updateFrontmatter()}>
                        <option value="VAR">VAR</option>
                        <option value="CONST">CONST</option>
                    </select>
                    <input
                        class="var-name"
                        type="text"
                        bind:value={variable.name}
                        on:input={() => updateFrontmatter()}
                        placeholder="name"
                    />
                    <span class="var-eq">=</span>
                    <input
                        class="var-value"
                        type="text"
                        bind:value={variable.value}
                        on:input={() => updateFrontmatter()}
                        placeholder="value"
                    />
                    <button class="var-delete clickable-icon" aria-label="Remove" on:click={() => removeVariable(i)}>×</button>
                </div>
            {/each}
        </div>
        <button class="add-var-btn" on:click={addVariable}>+ Add Variable</button>
    </div>

    <div class="parameters-section logic-section">
        <div class="parameters-header">
            <h3>Functions</h3>
            <span>Ink function definitions</span>
        </div>
        <textarea
            class="logic-editor"
            bind:value={functions}
            on:input={() => updateFrontmatter()}
            placeholder="=== function my_function(x) ===&#10;~ return x + 1"
        ></textarea>
    </div>
</div>

<style>
    .parameters-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 0 10px;
        gap: 16px;
    }
    .parameters-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .logic-section {
        flex: 1;
        overflow: hidden;
    }
    .parameters-section label {
        font-weight: bold;
        font-size: 0.9em;
        color: var(--text-muted);
    }
    .parameters-section input[type="text"] {
        width: 100%;
        background: var(--background-primary);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        padding: 6px 10px;
    }
    .parameters-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--background-modifier-border);
    }
    .parameters-header h3 {
        margin: 0;
        font-size: 1.1em;
    }
    .parameters-header span {
        font-size: 0.8em;
        color: var(--text-muted);
    }
    .variables-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .variable-row {
        display: flex;
        gap: 4px;
        align-items: center;
        background: var(--background-secondary);
        padding: 4px 6px;
        border-radius: var(--radius-s);
        font-size: 0.85em;
    }
    .var-type {
        width: 70px;
        flex-shrink: 0;
        font-size: 0.85em;
        padding: 2px;
    }
    .var-name {
        flex: 1;
        min-width: 0;
        font-family: var(--font-monospace);
        font-size: 0.85em;
        padding: 2px 4px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 2px;
        color: var(--text-normal);
    }
    .var-eq {
        color: var(--text-faint);
        flex-shrink: 0;
    }
    .var-value {
        flex: 1;
        min-width: 0;
        font-family: var(--font-monospace);
        font-size: 0.85em;
        padding: 2px 4px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 2px;
        color: var(--text-normal);
    }
    .var-delete {
        flex-shrink: 0;
        font-size: 1.1em;
        color: var(--text-muted);
        background: none;
        border: none;
        cursor: pointer;
        padding: 0 4px;
    }
    .var-delete:hover {
        color: var(--text-error);
    }
    .add-var-btn {
        width: 100%;
        font-size: 0.8em;
        background: var(--background-secondary-alt);
        border: 1px dashed var(--background-modifier-border);
        color: var(--text-muted);
        padding: 6px;
        border-radius: var(--radius-s);
        cursor: pointer;
    }
    .add-var-btn:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
    }
    .logic-editor {
        flex: 1;
        width: 100%;
        background: var(--background-primary);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        font-family: var(--font-monospace);
        font-size: 0.9em;
        padding: 10px;
        resize: none;
    }
</style>
