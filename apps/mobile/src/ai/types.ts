/**
 * Provider abstractions (AI_RECAP_TECHNICAL_ARCHITECTURE.md §7.5, §11). The app never imports a
 * vendor SDK directly — every screen talks to these protocols, so providers are swappable.
 */

/* ── Transcription ─────────────────────────────────────────────────────────── */

export interface TranscriptionInput {
  recapId: string;
  /** Local file URIs of the recap's audio chunks (or one concatenated file). */
  audioUris: string[];
  languageHint?: 'auto' | 'lv' | 'en';
}

export interface TranscriptionResultSegment {
  startTime: number;
  endTime: number;
  speakerLabel: string | null;
  language: string | null;
  text: string;
}

export interface TranscriptionResult {
  segments: TranscriptionResultSegment[];
  detectedLanguages: string[];
  durationSeconds: number;
}

export interface TranscriptionProvider {
  readonly supportsDiarization: boolean;
  readonly runsOnDevice: boolean;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

/* ── LLM ───────────────────────────────────────────────────────────────────── */

export interface LlmModel {
  id: string;
  name: string;
  contextLength?: number;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  /** JSON schema for structured output; providers that support it enable strict JSON mode. */
  responseJsonSchema?: unknown;
}

export interface LlmStreamChunk {
  delta: string;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmResult {
  text: string;
  model: string;
  usage: LlmUsage | null;
}

export interface LLMProvider {
  readonly name: string;
  generate(req: LlmRequest): Promise<LlmResult>;
  stream(req: LlmRequest): AsyncIterable<LlmStreamChunk>;
  availableModels(): Promise<LlmModel[]>;
}

/* ── Embeddings (Phase 2 semantic search) ──────────────────────────────────── */

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}
