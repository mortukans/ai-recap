/**
 * BYOK secret storage. The user's OpenRouter key lives ONLY in the OS keystore and is sent directly
 * from the device to OpenRouter — never to our backend (AI_RECAP_TECHNICAL_ARCHITECTURE.md §11/§21).
 */
import * as SecureStore from 'expo-secure-store';

const OPENROUTER_KEY_ID = 'airecap.byok.openrouter.key';

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export async function getOpenRouterKey(): Promise<string | null> {
  return SecureStore.getItemAsync(OPENROUTER_KEY_ID, SECURE_OPTIONS);
}

export async function setOpenRouterKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(OPENROUTER_KEY_ID, key.trim(), SECURE_OPTIONS);
}

export async function clearOpenRouterKey(): Promise<void> {
  await SecureStore.deleteItemAsync(OPENROUTER_KEY_ID, SECURE_OPTIONS);
}
