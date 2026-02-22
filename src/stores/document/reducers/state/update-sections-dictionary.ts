import { calculateColumnTreeIndexes } from 'src/stores/view/subscriptions/helpers/calculate-tree-index';
import { DocumentState } from 'src/stores/document/document-state-type';

export const updateSectionsDictionary = (state: DocumentState) => {
    state.sections = calculateColumnTreeIndexes(state.document.columns);
};
