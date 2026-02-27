# Lineage to Ink (v0.8.3)

Lineage to Ink is a visual authoring environment for [Inkle's Ink](https://www.inklestudios.com/ink/) scripting language, designed as an Obsidian plugin. It maps a Miller-column visual structure directly to Ink's branching narratives, offering a live simulator and global variable management.

---

## 🚀 Installation (Beta)

This plugin is currently in Beta and should be installed via [Obsidian BRAT](https://github.com/TfTHacker/obsidian42-brat).

1. Install **BRAT** from the Community Plugins browser.
2. Enable BRAT in settings.
3. Open Command Palette -> `BRAT: Add a beta plugin for testing`.
4. Paste: `https://github.com/defineagain/obsidianlineagetoink`
5. Click **Add Plugin** and enable it in Community Plugins.

---

## 🎨 The Miller Column Engine

The core philosophy of the plugin is **Visual Topology**. Your card positions in the Miller Column view determine their Ink type:

- **Column 1 (Roots)**: Compiled as **Knots** (`=== knot_name ===`).
- **Column 2 (Siblings of Knot)**: Compiled as **Stitches** (`= stitch_name`).
- **Column 3+ (Children)**: Compiled as **Choices** (`*` or `+`).
  - **Nested Columns**: Deeply nested children create nested choices and conditional branches.

### Node Logic
- **Header Badges**: When a card contains Ink logic (e.g., `~ health += 1` or `{gold > 5:}`), a **< >** icon appears in the header to indicate script side-effects.
- **Sticky vs. Standard**: Use the toggle button in the card header to switch between standard choices (`*`) and sticky choices (`+`).

---

## 🛠 The Ink Sidebar

Open via the **Grid Icon** in the ribbon or the command `Ink Sidebar: Open View`.

### 1. Editor Tab (`Edit` Icon)
- **Topologies**: Quick-apply Ink formatting (Knot, Stitch, Choice, etc.).
- **Validation**: Click **Parse & Check** to verify your visual tree follows Ink rules (e.g., ensuring Knots aren't children of Stitches).
- **Topology Rules**: An inline guide for valid narrative structures.

### 2. Player Tab (`Play` Icon)
- **Live Simulator**: Test your story in-memory using `ink.js`.
- **Interaction**: Click choices, read text, and restart the story without leaving Obsidian.

### 3. Values Tab (`Database` Icon)
- **Variable Management**: Centralized hub for all global `VAR` and `CONST` definitions.
- **Live Sync**: Variables in this tab update in **real-time** as you play the story in the Player Tab.
- **Initialization**: New variables are automatically prepended to the story preamble.

---

## 🔗 Advanced Flow & Logic

### Diverts via Wikilinks
Create links using standard Obsidian syntax: `[[TargetNode]]`. The plugin automatically translates these to Ink diverts: `-> TargetNode`.

### Variable Logic
Use standard Ink syntax inside cards:
- `~ variable = value` (Logic lines)
- `{variable: ... | ... }` (Conditional content)
- `()`, `{}`, `[]` (Weave logic)

---

## 💾 Dual-Mode I/O

The plugin treats your Obsidian vault as a first-class editor while supporting standard Ink pipelines:

- **→ Vault**: Saves as a special `.md` file with YAML frontmatter. Draggable to the Storyflow Canvas.
- **→ .ink Export**: Generates a standard `.ink` file compatible with Inky or Unity.
- **← .ink Import**: Reverses the process, turning a flat `.ink` file back into a visual Miller Column tree.
- **Eject**: Convert a Lineage file into standard Markdown.

---

## ⌨️ Common Commands

| Command | Description |
|---|---|
| `Create new document` | Starts a fresh Lineage to Ink file. |
| `Export to .ink` | Compiles the visual tree to a text-based Ink file. |
| `Import Ink file` | Parses an existing Ink file into card nodes. |
| `Toggle Lineage view` | Switches between standard Markdown and Miller Columns. |
| `Open Ink Presentation` | Jumps straight to the Player tab. |

---

## 🤝 Credits
Forked from the excellent [Obsidian Lineage](https://github.com/ycnmhd/obsidian-lineage) by ycnmhd. Optimized for Ink narrative design.
