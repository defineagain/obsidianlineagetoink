import { jsonToColumns } from 'src/lib/data-conversion/json-to-x/json-to-columns';
import { htmlCommentToJson } from 'src/lib/data-conversion/x-to-json/html-comment-to-json';
import {
    DocumentState,
    LineageDocument,
} from 'src/stores/document/document-state-type';
import { SavedDocument } from 'src/stores/document/document-store-actions';
import { insertFirstNode } from 'src/lib/tree-utils/insert/insert-first-node';
import invariant from 'tiny-invariant';
import { LineageDocumentFormat } from 'src/stores/settings/settings-type';
import { outlineToJson } from 'src/lib/data-conversion/x-to-json/outline-to-json';
import { htmlElementToJson } from 'src/lib/data-conversion/x-to-json/html-element-to-json';
import { extractInkBlock } from 'src/lib/ink-block/ink-block-utils';
import { inkToAst } from 'src/lib/ink-importer/ast-parser';

export type LoadDocumentAction = {
    type: 'document/file/load-from-disk';
    payload: {
        document: SavedDocument;
        format: LineageDocumentFormat;
        activeSection: string | null;
        __test_document__?: LineageDocument;
    };
};

export const loadDocumentFromFile = (
    state: DocumentState,
    action: LoadDocumentAction,
) => {
    let tree;
    if (action.payload.format === 'ink') {
        const block = extractInkBlock(action.payload.document.data);
        const inkSource = block ? block.inkSource : action.payload.document.data;
        const parsed = inkToAst(inkSource);
        tree = parsed.tree;
        // Store preamble/postamble and logic for round-trip fidelity
        state.file.inkPreamble = block ? block.preamble : '';
        state.file.inkPostamble = block ? block.postamble : '';
        state.file.inkLogic = parsed.logic;
    } else {
        tree =
            action.payload.format === 'outline'
                ? outlineToJson(action.payload.document.data)
                : action.payload.format === 'html-element'
                  ? htmlElementToJson(action.payload.document.data)
                  : htmlCommentToJson(action.payload.document.data);
    }
    const document = jsonToColumns(tree);
    state.document.columns = document.columns;
    state.document.content = document.content;
    const emptyTree = tree.length === 0;
    if (emptyTree) {
        insertFirstNode(state.document.columns, state.document.content);
    }
    if (action.type === 'document/file/load-from-disk')
        state.file.frontmatter = action.payload.document.frontmatter;
    const activeNode = state.document.columns[0].groups[0].nodes[0];
    invariant(activeNode);

    return activeNode;
};

