/**
 * SQLCipher key management. The 256-bit key is generated once and stored in the OS keystore
 * (Keychain / Android Keystore) via expo-secure-store, accessible only after first unlock and never
 * synced off-device. See AI_RECAP_TECHNICAL_ARCHITECTURE.md §21.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { bytesToHex } from './hex';

const DB_KEY_ID = 'airecap.db.sqlcipher.key';

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export async function getOrCreateDatabaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DB_KEY_ID, SECURE_OPTIONS);
  if (existing) return existing;

  const random = Crypto.getRandomBytes(32);
  const key = bytesToHex(random);
  await SecureStore.setItemAsync(DB_KEY_ID, key, SECURE_OPTIONS);
  return key;
}
