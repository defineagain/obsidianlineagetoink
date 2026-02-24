export const TOPOLOGY_RULES_MD = `
# Ink-Lineage Authoring Rules

This document defines the formal mapping between the Lineage Miller-column framework and the [Inkle Ink language](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md).

## 1. Structural Topology (The Columns)

The column depth in Lineage determines the structural "level" of the Ink element:

| Column | Ink Element | Level | Scope |
| --- | --- | --- | --- |
| **Column 1** | **Knot** (\`=== name ===\`) | Major | Global |
| **Column 2** | **Stitch** (\`= name\`) | Minor | Local to Knot |
| **Column 3+** | **Weave** (\`*\`, \`+\`, \`-\`) | Tactical | Branches/Gathers |

### Rules for Topology

1. **Knot Sovereignty**: Every card in Column 1 is a Knot.
2. **Stitch Precision**: Every child of a Column 1 card is a Stitch.
3. **The Weave Cliff**: Card in Column 3+ are Weave markers. Depth is \`ColumnIndex - 1\`.

## 2. Naming & Targeting

1. **Block Titles**: Knots/Stitches use the first H1 (\`# title\`) or a slugified fallback.
2. **Jump Targets**: Use \`-> knot_name.stitch_name\` for cross-block flow.

## 3. Flow Control

1. **Auto-Divert**: If a card has children, flow continues into them unless an explicit \`->\` is found.
2. **Choice Terminals**: Choices without children MUST end in \`-> destination\` or \`-> END\`.
`;
