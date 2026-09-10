/**
 * Versioned prompt assembly (AI_RECAP_TECHNICAL_ARCHITECTURE.md §13, Product Plan §30).
 * Components: SYSTEM + USER CONTEXT + MEETING METADATA + TRANSCRIPT + RECAP TEMPLATE + OUTPUT SCHEMA.
 * `promptVersion` is stored with every generated artifact for reproducibility.
 */
import type { Context, TranscriptSegment } from '@ai-recap/core';
import { RECAP_DOCUMENT_JSON_SCHEMA, formatTimestamp } from '@ai-recap/core';

export const RECAP_PROMPT_VERSION = 'recap/2026-09-10.1';
export const CHAT_PROMPT_VERSION = 'chat/2026-09-10.1';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MeetingMeta {
  title?: string;
  detectedLanguages: string[];
  durationSeconds: number;
  speakers?: string[];
}

export interface RecapPromptInput {
  /** Selected saved context (may be null). */
  context: Context | null;
  /** Preset/template instructions (from PRESET_DEFINITIONS or a custom template). */
  templateInstructions: string;
  meta: MeetingMeta;
  /** Full segments, or pre-reduced summary text for very long meetings (§ long-meeting strategy). */
  transcript: TranscriptSegment[] | string;
  /** Extra reusable context text (e.g. extracted attachment text). */
  extraContext?: string;
}

const RECAP_SYSTEM = [
  'You are AI Recap, an assistant that turns meeting transcripts into a structured, reusable recap.',
  'The audio may mix Latvian and English within the same sentence; understand both fluently and keep',
  'terms in their original language when that is how they were said.',
  'Every factual claim in decisions, action items, and important dates MUST include timestampRefs:',
  'the transcript offsets in seconds where it was said, so the app can link back to the audio.',
  'Respond with ONLY a JSON object matching the provided schema. No markdown, no prose outside JSON.',
].join(' ');

function renderTranscript(transcript: TranscriptSegment[] | string): string {
  if (typeof transcript === 'string') return transcript;
  return transcript
    .map((s) => {
      const who = s.speakerLabel ? `${s.speakerLabel}: ` : '';
      return `[${formatTimestamp(s.startTime)}] ${who}${s.text}`;
    })
    .join('\n');
}

function renderContext(context: Context | null): string {
  if (!context) return '';
  const vocab = context.vocabulary.length > 0 ? `\nKnown terms:\n- ${context.vocabulary.join('\n- ')}` : '';
  return `Context: ${context.name}\n${context.summary}${vocab}\n${context.instructions}`.trim();
}

export function buildRecapMessages(input: RecapPromptInput): LlmMessage[] {
  const langs = input.meta.detectedLanguages.length > 0 ? input.meta.detectedLanguages.join(', ') : 'auto';
  const parts: string[] = [];

  const ctx = renderContext(input.context);
  if (ctx) parts.push(`# User context\n${ctx}`);
  if (input.extraContext && input.extraContext.trim()) parts.push(`# Additional context\n${input.extraContext.trim()}`);

  parts.push(
    `# Meeting metadata\nTitle: ${input.meta.title ?? '(untitled)'}\nLanguages: ${langs}\nDuration (s): ${Math.round(
      input.meta.durationSeconds,
    )}`,
  );
  if (input.meta.speakers && input.meta.speakers.length > 0) {
    parts.push(`Speakers: ${input.meta.speakers.join(', ')}`);
  }

  parts.push(`# Recap template\n${input.templateInstructions}`);
  parts.push(`# Output JSON schema\n${JSON.stringify(RECAP_DOCUMENT_JSON_SCHEMA)}`);
  parts.push(`# Transcript\n${renderTranscript(input.transcript)}`);

  return [
    { role: 'system', content: RECAP_SYSTEM },
    { role: 'user', content: parts.join('\n\n') },
  ];
}

const CHAT_SYSTEM = [
  'You are AI Recap answering questions about one recorded meeting.',
  'Ground every answer in the transcript and provided context. If the answer is not in the material,',
  'say so plainly. When you state something from the meeting, cite the transcript time as [mm:ss].',
  'The meeting may mix Latvian and English; answer in the language the user asks in.',
].join(' ');

export interface ChatPromptInput {
  context: Context | null;
  meta: MeetingMeta;
  transcript: TranscriptSegment[] | string;
  history: LlmMessage[];
  question: string;
}

export function buildChatMessages(input: ChatPromptInput): LlmMessage[] {
  const grounding = [
    renderContext(input.context),
    `# Transcript\n${renderTranscript(input.transcript)}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return [
    { role: 'system', content: `${CHAT_SYSTEM}\n\n${grounding}` },
    ...input.history,
    { role: 'user', content: input.question },
  ];
}
