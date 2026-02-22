import { Column, Sections } from 'src/stores/document/document-state-type';

export type SectionsDictionary = { [nodeId: string]: string };

export const calculateColumnTreeIndexes = (columns: Column[]) => {
    const sections: Sections = { id_section: {}, section_id: {} };
    if (columns.length === 0) return sections;

    for (let nI = 0; nI < columns[0].groups[0].nodes.length; nI++) {
        const node = columns[0].groups[0].nodes[nI];

        const section = String(nI + 1);
        sections.id_section[node] = section;
        sections.section_id[section] = node;
    }
    for (let cI = 1; cI < columns.length; cI++) {
        const column = columns[cI];
        for (let gI = 0; gI < column.groups.length; gI++) {
            const group = column.groups[gI];
            for (let nI = 0; nI < group.nodes.length; nI++) {
                const node = group.nodes[nI];

                const section =
                    sections.id_section[group.parentId] + '.' + (nI + 1);
                sections.id_section[node] = section;
                sections.section_id[section] = node;
            }
        }
    }
    return sections;
};
