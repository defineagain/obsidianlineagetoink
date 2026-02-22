import { describe, expect, it } from 'vitest';
import { NavigationHistory } from 'src/stores/document/document-state-type';
import { removeDeletedNavigationItems } from 'src/stores/view/reducers/ui/helpers/remove-deleted-navigation-items';

describe('add navigation history item', () => {
    it('case 1', () => {
        const content = {
            1: { content: '' },
            2: { content: '' },
            3: { content: '' },
            4: { content: '' },
        };

        const input: NavigationHistory = {
            state: {
                activeIndex: 3,
                canGoForward: false,
                canGoBack: true,
            },
            items: ['1', '2', '3', '4'],
            context: undefined,
        };

        const output: NavigationHistory = {
            state: {
                activeIndex: 3,
                canGoForward: false,
                canGoBack: true,
            },
            items: ['1', '2', '3', '4'],
            context: undefined,
        };

        removeDeletedNavigationItems({ navigationHistory: input }, content);
        expect(input).toEqual(output);
    });
    it('case 2', () => {
        const content = {
            1: { content: '' },
            2: { content: '' },
            4: { content: '' },
        };

        const input: NavigationHistory = {
            state: {
                activeIndex: 3,
                canGoForward: false,
                canGoBack: true,
            },
            items: ['1', '4', '3', '4'],
            context: undefined,
        };

        const output: NavigationHistory = {
            state: {
                activeIndex: 1,
                canGoForward: false,
                canGoBack: true,
            },
            items: ['1', '4'],
            context: undefined,
        };

        removeDeletedNavigationItems({ navigationHistory: input }, content);
        expect(input).toEqual(output);
    });
});
