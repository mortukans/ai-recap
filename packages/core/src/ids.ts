/**
 * Id generation is injected (the app provides an implementation backed by expo-crypto's randomUUID),
 * so `@ai-recap/core` stays free of platform dependencies and remains trivially testable.
 */
import type { Id } from './models';

export interface IdGenerator {
  newId(): Id;
}
