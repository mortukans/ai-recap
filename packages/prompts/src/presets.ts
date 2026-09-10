/**
 * Built-in preset contexts (Product Plan §5, §27). Each preset is a maintained context/template
 * package. A user may use it as-is, add recording-specific context, or combine with a custom context.
 *
 * Built-in contexts use deterministic ids (`builtin:<presetKey>`) so seeding is idempotent and
 * artifacts can reference a stable context version.
 */
import type { Context, PresetKey } from '@ai-recap/core';

export interface PresetDefinition {
  key: Exclude<PresetKey, 'custom'>;
  name: string;
  summary: string;
  vocabulary: string[];
  instructions: string;
}

export const PRESET_DEFINITIONS: readonly PresetDefinition[] = [
  {
    key: 'workMeeting',
    name: 'Work Meeting',
    summary: 'Internal team or project meeting.',
    vocabulary: [],
    instructions:
      'Produce a concise summary, then extract decisions, action items (with owner and deadline when stated), important dates, open questions, and topics. Prefer clarity over completeness.',
  },
  {
    key: 'lecture',
    name: 'Lecture',
    summary: 'Educational talk, class, or presentation.',
    vocabulary: [],
    instructions:
      'Summarize the main thesis and key points as structured notes. Capture definitions, examples, and any assignments or deadlines. Decisions/action items are usually sparse; that is expected.',
  },
  {
    key: 'interview',
    name: 'Interview',
    summary: 'Job, research, or press interview.',
    vocabulary: [],
    instructions:
      'Summarize the conversation, attribute notable statements to the correct speaker, and list follow-up questions and commitments. Keep quotes faithful.',
  },
  {
    key: 'personalVoiceNote',
    name: 'Personal Voice Note',
    summary: 'A personal memo, idea, or reminder.',
    vocabulary: [],
    instructions:
      'Write a short summary and turn any intentions into action items. Keep it personal and brief; do not invent structure that is not there.',
  },
  {
    key: 'salesCall',
    name: 'Sales Call',
    summary: 'Prospect or customer sales conversation.',
    vocabulary: [],
    instructions:
      'Summarize needs, objections, pricing discussion, and next steps. Extract action items and a suggested follow-up. Note the deal stage and any dates or commitments.',
  },
] as const;

export function builtInContexts(now: number): Context[] {
  return PRESET_DEFINITIONS.map((def) => ({
    id: `builtin:${def.key}`,
    name: def.name,
    summary: def.summary,
    vocabulary: [...def.vocabulary],
    instructions: def.instructions,
    isBuiltIn: true,
    createdAt: now,
    updatedAt: now,
  }));
}

export function presetContextId(key: Exclude<PresetKey, 'custom'>): string {
  return `builtin:${key}`;
}
