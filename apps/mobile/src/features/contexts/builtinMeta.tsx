/** Presentation metadata for the five built-in contexts: icon + localized description (HANDOFF.md §5.5). */
import type { TFunction } from 'i18next';

import type { IconName } from '../../design/icons';

const ORDER = ['workMeeting', 'salesCall', 'personalVoiceNote', 'interview', 'lecture'] as const;
type PresetKey = (typeof ORDER)[number];

const ICONS: Record<PresetKey, IconName> = {
  workMeeting: 'people',
  salesCall: 'chat',
  personalVoiceNote: 'mic',
  interview: 'lines',
  lecture: 'book',
};

export function presetKeyOf(contextId: string): PresetKey | null {
  const key = contextId.startsWith('builtin:') ? contextId.slice('builtin:'.length) : null;
  return key && (ORDER as readonly string[]).includes(key) ? (key as PresetKey) : null;
}

export function builtinIcon(contextId: string): IconName {
  const key = presetKeyOf(contextId);
  return key ? ICONS[key] : 'contexts';
}

export function builtinDescription(contextId: string, t: TFunction): string {
  const key = presetKeyOf(contextId);
  return key ? t(`ui.builtinDesc.${key}`) : '';
}

/** Display order for the built-in section. */
export function builtinOrder(contextId: string): number {
  const key = presetKeyOf(contextId);
  return key ? ORDER.indexOf(key) : ORDER.length;
}
