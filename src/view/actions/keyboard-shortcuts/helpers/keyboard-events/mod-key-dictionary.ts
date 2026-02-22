import { modKey } from 'src/view/actions/keyboard-shortcuts/helpers/keyboard-events/mod-key';
import { Modifier } from 'obsidian';

export const modKeyDictionary: Record<Modifier, string> = {
    Mod: modKey,
    Alt: 'Alt',
    Ctrl: 'Ctrl',
    Meta: 'Meta',
    Shift: 'Shift',
};
