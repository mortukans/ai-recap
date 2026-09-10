/**
 * Processing state machine (AI_RECAP_TECHNICAL_ARCHITECTURE.md §9, Product Plan §10).
 *
 *   recording ─finishRecording→ recorded
 *   recorded ─connectivity(online)→ transcribing
 *   recorded ─connectivity(offline)→ waitingForNetwork
 *   waitingForNetwork ─connectivity(online)→ transcribing
 *   transcribing ─transcriptionSucceeded→ transcribed ─(auto)summarizationStarted→ summarizing
 *   summarizing ─summarizationSucceeded→ ready
 *   transcribing ─transcriptionFailed→ transcriptionFailed
 *   summarizing  ─summarizationFailed→ summaryFailed
 *   (upload step) ─uploadFailed→ uploadFailed
 *
 * INVARIANT: no failure state discards source audio; every failure is re-entrant to its predecessor
 * via `retry`. `transition()` returns `null` for events that don't apply to the current state
 * (a no-op the caller can safely ignore).
 */
import type { RecapStatus } from './enums';

export type ProcessingEvent =
  | { type: 'finishRecording' }
  | { type: 'connectivityChanged'; online: boolean }
  | { type: 'transcriptionStarted' }
  | { type: 'transcriptionSucceeded' }
  | { type: 'transcriptionFailed' }
  | { type: 'summarizationStarted' }
  | { type: 'summarizationSucceeded' }
  | { type: 'summarizationFailed' }
  | { type: 'uploadFailed' }
  | { type: 'retry' };

const FAILURE_STATES: ReadonlySet<RecapStatus> = new Set<RecapStatus>([
  'transcriptionFailed',
  'summaryFailed',
  'uploadFailed',
]);

export function isFailureState(status: RecapStatus): boolean {
  return FAILURE_STATES.has(status);
}

export function isTerminal(status: RecapStatus): boolean {
  return status === 'ready';
}

export function isProcessing(status: RecapStatus): boolean {
  return status === 'transcribing' || status === 'summarizing';
}

/**
 * Where a failed recap re-enters when retried. `uploadFailed` re-uploads then re-transcribes, so it
 * returns to `transcribing`.
 */
export function retryTarget(status: RecapStatus): RecapStatus | null {
  switch (status) {
    case 'transcriptionFailed':
    case 'uploadFailed':
      return 'transcribing';
    case 'summaryFailed':
      return 'summarizing';
    default:
      return null;
  }
}

export function canRetry(status: RecapStatus): boolean {
  return retryTarget(status) !== null;
}

/**
 * Pure transition. Returns the next status, or `null` if the event does not apply.
 */
export function transition(status: RecapStatus, event: ProcessingEvent): RecapStatus | null {
  switch (event.type) {
    case 'finishRecording':
      return status === 'recording' ? 'recorded' : null;

    case 'connectivityChanged': {
      if (!event.online) {
        // Only a not-yet-started recap parks itself waiting for the network.
        return status === 'recorded' ? 'waitingForNetwork' : null;
      }
      // Coming back online, a parked/ready-to-process recap advances to transcription.
      return status === 'waitingForNetwork' || status === 'recorded' ? 'transcribing' : null;
    }

    case 'transcriptionStarted':
      return status === 'recorded' || status === 'waitingForNetwork' ? 'transcribing' : null;

    case 'transcriptionSucceeded':
      return status === 'transcribing' ? 'transcribed' : null;

    case 'transcriptionFailed':
      return status === 'transcribing' ? 'transcriptionFailed' : null;

    case 'summarizationStarted':
      // `transcribed` auto-advances into summarizing.
      return status === 'transcribed' ? 'summarizing' : null;

    case 'summarizationSucceeded':
      return status === 'summarizing' ? 'ready' : null;

    case 'summarizationFailed':
      return status === 'summarizing' ? 'summaryFailed' : null;

    case 'uploadFailed':
      // An upload can fail while we believed we were transcribing.
      return status === 'transcribing' ? 'uploadFailed' : null;

    case 'retry':
      return retryTarget(status);

    default: {
      // Exhaustiveness guard.
      const _never: never = event;
      return _never;
    }
  }
}

/** Convenience: apply an event, returning the unchanged status when the event doesn't apply. */
export function reduce(status: RecapStatus, event: ProcessingEvent): RecapStatus {
  return transition(status, event) ?? status;
}
