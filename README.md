# Lineage to Ink

Lineage to Ink is a specialized fork of the popular [Lineage](https://github.com/ycnmhd/obsidian-lineage) Obsidian plugin, designed specifically as a visual authoring environment for [Inkle's](https://www.inklestudios.com/ink/) `.ink` scripting language.

It allows you to map horizontal branching UI columns directly to Ink's Knot/Stitch/Choice topologies, add Logic variables, and test your narrative flows natively within Obsidian.

## Installation via BRAT 

This plugin is currently in Beta (v0.1) and must be installed via [Obsidian BRAT](https://github.com/TfTHacker/obsidian42-brat).

1. Install the **BRAT** plugin from the Obsidian Community Plugins browser.
2. Enable BRAT in your settings.
3. Open the command palette and run `BRAT: Add a beta plugin for testing`.
4. Paste the repository URL: `https://github.com/defineagain/obsidianlineagetoink`
5. Click **Add Plugin**.
6. Go to Settings > Community Plugins and enable **Lineage to Ink**.

## Initial Walkthrough & Core Features

### 1. Creating a Flow
- Open the Command Palette and run `Lineage: Create new document` to open the visual Miller-columns graph.
- **Topology Mapping**: 
  - **Column 1 (Roots)**: Act as Ink **Knots** (`=== knot_name ===`).
  - **Children**: Act as Ink **Stitches** (`= stitch_name`).
  - **Branching Leaves**: Act as Ink **Choices** (`*` or `+`).

### 2. Ink Properties & Logic
- **Global Variables**: Run `Lineage: Open Ink Property Editor` to open the right-hand sidebar view. Here, you can define global `VAR` and `CONST` values. These save to a `.inkconfig` JSON sidecar file.
- **Logic Badges**: When you type Ink logic inside a card (e.g., `~ money = 100` or `{health > 50:}`), a subtle visual **< >** logic indicator will automatically appear on the card UI.
- **Sticky Choices**: In the top right corner of branching cards, click the `*` icon to toggle it to a `+`. This converts the standard "once-only" Ink choice into a "sticky" fallback choice.

### 3. Links & Diverts
Use standard Obsidian wikilinks `[[KnotName]]` within your card text. When exported, the compiler intercepts these and translates them cleanly to Ink divert arrows: `-> KnotName`.

### 4. Presentation & Playback
- You don't need to leave Obsidian to test your branching logic! 
- Run `Lineage: Open Ink Presentation View` to open a dedicated split-leaf playback environment. 
- It simulates your current active Lineage document using `ink.js` completely in-memory, letting you click choices and ensure variables fire without throwing runtime errors.

### 5. Exporting
Once your branching visual novel scene is complete, run the command `Lineage: Export Lineage to .ink`. The plugin traverses the visual AST tree, builds the required gathers and diverts, and generates a perfectly formatted `.ink` file saved straight to your vault, ready for Unity or Godot imports.
