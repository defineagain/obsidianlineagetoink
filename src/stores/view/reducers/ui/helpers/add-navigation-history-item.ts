import { NodeId } from 'src/stores/document/document-state-type';
import { removeObsoleteHistoryItems } from 'src/stores/document/reducers/history/helpers/remove-obsolete-history-items';
import { removeOldHistoryItems } from 'src/stores/document/reducers/history/helpers/remove-old-history-items';
import { updateNavigationState } from 'src/stores/document/reducers/history/helpers/update-navigation-state';
import { ViewState } from 'src/stores/view/view-state-type';

export const addNavigationHistoryItem = (
    state: Pick<ViewState, 'navigationHistory'>,
    nodeId: NodeId,
) => {
    if (!nodeId) return;

    removeObsoleteHistoryItems(state.navigationHistory);
    removeOldHistoryItems(state.navigationHistory, 100);
    const activeItem =
        state.navigationHistory.items[state.navigationHistory.items.length - 1];
    if (activeItem !== nodeId) {
        state.navigationHistory.items.push(nodeId);
    }

    state.navigationHistory.state.activeIndex =
        state.navigationHistory.items.length - 1;
    updateNavigationState(state.navigationHistory);
    state.navigationHistory = {
        ...state.navigationHistory,
    };
};
