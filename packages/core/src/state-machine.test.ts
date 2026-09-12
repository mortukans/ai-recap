import { describe, expect, it } from 'vitest';
import type { RecapStatus } from './enums';
import {
  canRetry,
  isFailureState,
  isProcessing,
  isTerminal,
  reduce,
  retryTarget,
  transition,
} from './state-machine';

describe('transition', () => {
  it('recording finishes to recorded', () => {
    expect(transition('recording', { type: 'finishRecording' })).toBe('recorded');
  });

  it('finishRecording is a no-op from a non-recording state', () => {
    expect(transition('recorded', { type: 'finishRecording' })).toBeNull();
  });

  it('going offline parks a recorded recap', () => {
    expect(transition('recorded', { type: 'connectivityChanged', online: false })).toBe('waitingForNetwork');
  });

  it('reconnecting advances waitingForNetwork to transcribing', () => {
    expect(transition('waitingForNetwork', { type: 'connectivityChanged', online: true })).toBe('transcribing');
  });

  it('drives the full happy path to ready', () => {
    let s: RecapStatus = 'recording';
    s = reduce(s, { type: 'finishRecording' });
    s = reduce(s, { type: 'transcriptionStarted' });
    s = reduce(s, { type: 'transcriptionSucceeded' });
    s = reduce(s, { type: 'summarizationStarted' });
    s = reduce(s, { type: 'summarizationSucceeded' });
    expect(s).toBe('ready');
  });

  it('transcription failure is re-enterable via retry', () => {
    expect(transition('transcribing', { type: 'transcriptionFailed' })).toBe('transcriptionFailed');
    expect(transition('transcriptionFailed', { type: 'retry' })).toBe('transcribing');
  });

  it('summary failure retries back into summarizing', () => {
    expect(transition('summarizing', { type: 'summarizationFailed' })).toBe('summaryFailed');
    expect(transition('summaryFailed', { type: 'retry' })).toBe('summarizing');
  });

  it('uploadFailed retries into transcribing', () => {
    expect(retryTarget('uploadFailed')).toBe('transcribing');
  });

  it('returns null for events that do not apply', () => {
    expect(transition('ready', { type: 'transcriptionStarted' })).toBeNull();
    expect(transition('recorded', { type: 'summarizationSucceeded' })).toBeNull();
    expect(transition('ready', { type: 'retry' })).toBeNull();
  });
});

describe('helpers', () => {
  it('classifies failure states', () => {
    expect(isFailureState('transcriptionFailed')).toBe(true);
    expect(isFailureState('summaryFailed')).toBe(true);
    expect(isFailureState('uploadFailed')).toBe(true);
    expect(isFailureState('ready')).toBe(false);
    expect(isFailureState('transcribing')).toBe(false);
  });

  it('marks only ready as terminal', () => {
    expect(isTerminal('ready')).toBe(true);
    expect(isTerminal('summarizing')).toBe(false);
  });

  it('detects in-flight processing', () => {
    expect(isProcessing('transcribing')).toBe(true);
    expect(isProcessing('summarizing')).toBe(true);
    expect(isProcessing('recorded')).toBe(false);
  });

  it('canRetry only for failure states', () => {
    expect(canRetry('transcriptionFailed')).toBe(true);
    expect(canRetry('summaryFailed')).toBe(true);
    expect(canRetry('ready')).toBe(false);
    expect(canRetry('recorded')).toBe(false);
  });

  it('reduce keeps status on a no-op event', () => {
    expect(reduce('ready', { type: 'finishRecording' })).toBe('ready');
  });
});
