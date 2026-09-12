/**
 * APPROXIMATE provider pricing, USD per audio-minute. VERIFY against each provider's current pricing
 * page before quoting numbers — these are directional placeholders (as of early 2026).
 */
export const PRICING_USD_PER_MIN = {
  'openai:whisper-1': 0.006,
  'openai:gpt-4o-transcribe': 0.006,
  'openai:gpt-4o-mini-transcribe': 0.003,
  'deepgram:nova-3': 0.0043,
  'deepgram:nova-2': 0.0043,
  // Speechmatics is tiered (~$0.30–$1.04/hr). Using ~$0.60/hr = $0.01/min as a mid placeholder.
  'speechmatics:standard': 0.01,
};

export function costUsd(providerModelKey, durationSeconds) {
  const perMin = PRICING_USD_PER_MIN[providerModelKey];
  if (perMin === undefined || !Number.isFinite(durationSeconds)) return null;
  return (durationSeconds / 60) * perMin;
}

export function perHourUsd(providerModelKey) {
  const perMin = PRICING_USD_PER_MIN[providerModelKey];
  return perMin === undefined ? null : perMin * 60;
}
