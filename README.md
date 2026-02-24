# Lineage to Ink

Lineage to Ink is a specialized authoring environment for [Inkle's](https://www.inklestudios.com/ink/) `.ink` scripting language, built as an Obsidian plugin.

It is a fork of the [Lineage](https://github.com/ycnmhd/obsidian-lineage) plugin, optimized for mapping Miller-column visual structures directly to Ink's Knot, Stitch, and Choice topologies.

## Installation via BRAT

This plugin is currently in Beta (**v0.3.6**) and must be installed via [Obsidian BRAT](https://github.com/TfTHacker/obsidian42-brat).

1. Install the **BRAT** plugin from the Obsidian Community Plugins browser.
2. Enable BRAT in your settings.
3. Open the command palette and run `BRAT: Add a beta plugin for testing`.
4. Paste the repository URL: `https://github.com/defineagain/obsidianlineagetoink`
5. Click **Add Plugin**.
6. Go to Settings > Community Plugins and enable **Lineage to Ink**.

## Core Features & Workflow

### 1. Visual Authoring

- Run `Lineage to Ink: Create new document` to start a new branching narrative.
- **Miller Column Topology**:
  - **Leftmost Columns (Roots)**: Compiled as Ink **Knots** (`=== knot_name ===`).
  - **Middle Columns**: Compiled as Ink **Stitches** (`= stitch_name`).
  - **Right Sidebar / Branching Leaves**: Compiled as Ink **Choices** (`*` or `+`).

### 2. Ink Properties & Logic

- **Property Editor**: Run `Lineage to Ink: Open Ink Property Editor` to open the right-hand sidebar. Here you can define global `VAR`, `CONST`, and `LIST` definitions.
- **Logic Badges**: When you type Ink logic inside a card (e.g., `~ health += 10` or `{money > 5:}`), a visual **< >** indicator appears in the card header to signify logical side-effects.
- **Sticky Choices**: Toggle between standard choices (`*`) and "sticky" choices (`+`) using the button in the card UI.

### 3. Links & Diverts

Use standard Obsidian wikilinks `[[KnotName]]` to create diverts. When exported, these are automatically translated to Ink diverts: `-> KnotName`.

### 4. Presentation Mode (Simulator)

- Test your story without leaving Obsidian.
- Run `Lineage to Ink: Open Ink Presentation View` to open the simulator.
- It runs your narrative in-memory using `ink.js`, allowing you to play through your branching logic and verify variable states.

### 5. Exporting to .ink

Once your scene is ready, run `Lineage to Ink: Export to .ink`. The plugin traverses the visual tree, resolves all wildcards and diverts, and generates a formatted `.ink` file in your vault.

## Credits

Based on the excellent [Obsidian Lineage](https://github.com/ycnmhd/obsidian-lineage) plugin by ycnmhd.
