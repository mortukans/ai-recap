/**
 * Lightweight non-secret preferences (selected model, etc.) via AsyncStorage.
 * Secrets (BYOK keys) live in expo-secure-store, never here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUMMARY_MODEL_KEY = 'airecap.pref.summaryModel';
const TRANSCRIPTION_MODEL_KEY = 'airecap.pref.transcriptionModel';
const AUDIO_RETENTION_KEY = 'airecap.pref.audioRetentionDays';

/** Days to keep recorded audio after processing; null = keep forever (default). */
export async function getAudioRetentionDays(): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(AUDIO_RETENTION_KEY);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export async function setAudioRetentionDays(days: number | null): Promise<void> {
  try {
    if (days === null) await AsyncStorage.removeItem(AUDIO_RETENTION_KEY);
    else await AsyncStorage.setItem(AUDIO_RETENTION_KEY, String(days));
  } catch {
    /* non-fatal */
  }
}

/** OpenRouter model used for audio transcription (null → provider default). */
export async function getTranscriptionModel(): Promise<string | null> {
  try {
    return (await AsyncStorage.getItem(TRANSCRIPTION_MODEL_KEY)) || null;
  } catch {
    return null;
  }
}

export async function setTranscriptionModel(model: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TRANSCRIPTION_MODEL_KEY, model.trim());
  } catch {
    /* non-fatal */
  }
}

export async function getSummaryModel(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SUMMARY_MODEL_KEY);
  } catch {
    return null;
  }
}

export async function setSummaryModel(model: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SUMMARY_MODEL_KEY, model.trim());
  } catch {
    /* non-fatal */
  }
}

const DEFAULT_CONTEXT_KEY = 'airecap.pref.defaultContextId';
const ONBOARDED_KEY = 'airecap.pref.onboarded';

/** Last context the user picked; applied to new recordings (Product Plan §4 "ask after recording"). */
export async function getDefaultContextId(): Promise<string | null> {
  try {
    return (await AsyncStorage.getItem(DEFAULT_CONTEXT_KEY)) || null;
  } catch {
    return null;
  }
}

export async function setDefaultContextId(id: string | null): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(DEFAULT_CONTEXT_KEY, id);
    else await AsyncStorage.removeItem(DEFAULT_CONTEXT_KEY);
  } catch {
    /* non-fatal */
  }
}

export async function isOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDED_KEY)) === '1';
  } catch {
    return true; // never trap the user in onboarding if storage is unavailable
  }
}

export async function setOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    /* non-fatal */
  }
}

const DONE_TASKS_PREFIX = 'airecap.pref.doneTasks.';

/** Indices of action items the user ticked off on a recap (UI state only; the recap itself is immutable). */
export async function getDoneTasks(recapId: string): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(DONE_TASKS_PREFIX + recapId);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

export async function setDoneTasks(recapId: string, indices: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DONE_TASKS_PREFIX + recapId, JSON.stringify(indices));
  } catch {
    /* non-fatal */
  }
}

const RECAP_MODELS_PREFIX = 'airecap.pref.recapModels.';

/** Per-recap model overrides for quality experiments (both optional → global defaults apply). */
export interface RecapModels {
  summaryModel?: string;
  transcriptionModel?: string;
}

export async function getRecapModels(recapId: string): Promise<RecapModels> {
  try {
    const raw = await AsyncStorage.getItem(RECAP_MODELS_PREFIX + recapId);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as RecapModels) : {};
  } catch {
    return {};
  }
}

export async function setRecapModels(recapId: string, models: RecapModels): Promise<void> {
  try {
    await AsyncStorage.setItem(RECAP_MODELS_PREFIX + recapId, JSON.stringify(models));
  } catch {
    /* non-fatal */
  }
}

const PROCESSING_PAUSED_KEY = 'airecap.pref.processingPaused';

/** True after a force-stop: the queue must not restart itself on the next launch. */
export async function getProcessingPaused(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PROCESSING_PAUSED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setProcessingPaused(paused: boolean): Promise<void> {
  try {
    if (paused) await AsyncStorage.setItem(PROCESSING_PAUSED_KEY, '1');
    else await AsyncStorage.removeItem(PROCESSING_PAUSED_KEY);
  } catch {
    /* non-fatal */
  }
}

const APP_LANGUAGE_KEY = 'airecap.pref.appLanguage';
export type AppLanguage = 'auto' | 'lv' | 'en';

export async function getAppLanguage(): Promise<AppLanguage> {
  try {
    const v = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
    return v === 'lv' || v === 'en' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_LANGUAGE_KEY, lang);
  } catch {
    /* non-fatal */
  }
}
