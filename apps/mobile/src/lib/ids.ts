import type { IdGenerator } from '@ai-recap/core';
import * as Crypto from 'expo-crypto';

export function newId(): string {
  return Crypto.randomUUID();
}

export const idGenerator: IdGenerator = { newId };
