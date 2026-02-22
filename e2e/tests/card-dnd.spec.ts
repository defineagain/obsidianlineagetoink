import { expect, test } from '../helpers/base-test';
import { text } from '../helpers/general/text';
import { addCardUsingHotkey } from '../helpers/interactions/lineage-view/hotkeys/add-card-using-hotkey';
import { getTextsOfColumns } from '../helpers/getters/lineage-view/card/get-texts-of-columns';
import { selectCard } from '../helpers/interactions/lineage-view/card/select-card';
import { getCardId } from '../helpers/getters/lineage-view/card/get-card.id';
import { dragAndDropBelow } from '../helpers/interactions/dom/drag-and-drop-below';
import { typeTextAndSaveItUsingHotkey } from '../helpers/interactions/lineage-view/card/type-text-and-save-it-using-hotkey';

test('drag and drop', async () => {
    const n1 = text();
    const n2 = text();
    const n3 = text();
    const n4 = text();
    const n5 = text();
    const n6 = text();
    const n7 = text();
    const n8 = text();

    await typeTextAndSaveItUsingHotkey(n1);

    await addCardUsingHotkey('down');
    await typeTextAndSaveItUsingHotkey(n2);

    await addCardUsingHotkey('right');
    await typeTextAndSaveItUsingHotkey(n3);

    await addCardUsingHotkey('down');
    await typeTextAndSaveItUsingHotkey(n4);

    await addCardUsingHotkey('right');
    await typeTextAndSaveItUsingHotkey(n5);

    await addCardUsingHotkey('right');
    await typeTextAndSaveItUsingHotkey(n6);

    expect(await getTextsOfColumns()).toEqual([[n1, n2], [n3, n4], [n5], [n6]]);
    await selectCard(1, 0);

    await addCardUsingHotkey('right');
    await typeTextAndSaveItUsingHotkey(n7);

    await addCardUsingHotkey('right');
    await typeTextAndSaveItUsingHotkey(n8);

    expect(await getTextsOfColumns()).toEqual([
        [n1, n2],
        [n3, n4],
        [n7, n5],
        [n8, n6],
    ]);

    const n4Card = await getCardId(1, 1);
    const n1Card = await getCardId(0, 0);

    await dragAndDropBelow(n4Card, n1Card);
    expect(await getTextsOfColumns()).toEqual([
        [n1, n4, n2],
        [n5, n3],
        [n6, n7],
        [n8],
    ]);

    const n2Card = await getCardId(0, 2);
    await dragAndDropBelow(n2Card, n1Card);

    expect(await getTextsOfColumns()).toEqual([
        [n1, n2, n4],
        [n3, n5],
        [n7, n6],
        [n8],
    ]);

    const n3Card = await getCardId(1, 0);
    await dragAndDropBelow(n3Card, n4Card);
    expect(await getTextsOfColumns()).toEqual([
        [n1, n2, n4, n3],
        [n5, n7],
        [n6, n8],
    ]);
});
