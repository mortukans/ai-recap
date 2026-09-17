/**
 * Lightweight non-secret preferences (selected model, etc.) via AsyncStorage.
 * Secrets (BYOK keys) live in expo-secure-store, never here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUMMARY_MODEL_KEY = 'airecap.pref.summaryModel';
const TRANSCRIPTION_MODEL_KEY = 'airecap.pref.transcriptionModel';

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
