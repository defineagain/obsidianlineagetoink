import { Platform } from 'obsidian';

export const isMacLike = Platform.isMacOS || Platform.isIosApp;
export const modKey = isMacLike ? 'Cmd' : 'Ctrl';
