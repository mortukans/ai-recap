import type { Context, TranscriptSegment } from '@ai-recap/core';
import { describe, expect, it } from 'vitest';
import { buildChatMessages, buildRecapMessages } from './assembler';
import { PRESET_DEFINITIONS, builtInContexts, presetContextId } from './presets';

describe('presets', () => {
  it('exposes 5 built-in presets with deterministic ids', () => {
    expect(PRESET_DEFINITIONS).toHaveLength(5);
    const ctx = builtInContexts(1000);
    expect(ctx).toHaveLength(5);
    expect(ctx.map((c) => c.id)).toContain('builtin:workMeeting');
    expect(presetContextId('salesCall')).toBe('builtin:salesCall');
    expect(ctx.every((c) => c.isBuiltIn)).toBe(true);
  });
});

const segments: TranscriptSegment[] = [
  { id: '1', recapId: 'r', startTime: 10, endTime: 12, speakerLabel: 'Speaker 1', language: 'lv', text: 'Sales7 integrācija' },
];

describe('buildRecapMessages', () => {
  it('emits a system + user message with transcript, timestamps and schema', () => {
    const msgs = buildRecapMessages({
      context: null,
      templateInstructions: 'Summarize.',
      meta: { detectedLanguages: ['lv', 'en'], durationSeconds: 100 },
      transcript: segments,
    });
    expect(msgs[0]?.role).toBe('system');
    expect(msgs[1]?.role).toBe('user');
    expect(msgs[1]?.content).toContain('[0:10]');
    expect(msgs[1]?.content).toContain('Sales7 integrācija');
    expect(msgs[1]?.content).toContain('Output JSON schema');
  });

  it('renders selected context vocabulary and plain-string transcript', () => {
    const ctx: Context = {
      id: 'c',
      name: 'Capital – IT',
      summary: 'Internal IT',
      vocabulary: ['Sales7 = internal ERP'],
      instructions: 'Focus on automation.',
      isBuiltIn: false,
      createdAt: 0,
      updatedAt: 0,
    };
    const msgs = buildRecapMessages({
      context: ctx,
      templateInstructions: 't',
      meta: { detectedLanguages: [], durationSeconds: 0 },
      transcript: 'plain transcript text',
    });
    expect(msgs[1]?.content).toContain('Sales7 = internal ERP');
    expect(msgs[1]?.content).toContain('plain transcript text');
  });
});

describe('buildChatMessages', () => {
  it('grounds in transcript and ends with the question', () => {
    const msgs = buildChatMessages({
      context: null,
      meta: { detectedLanguages: ['lv'], durationSeconds: 0 },
      transcript: 'Transcript body',
      history: [{ role: 'user', content: 'hi' }],
      question: 'What was decided?',
    });
    expect(msgs[0]?.role).toBe('system');
    expect(msgs[0]?.content).toContain('Transcript body');
    expect(msgs.at(-1)?.content).toBe('What was decided?');
  });
});
