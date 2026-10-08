import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = { prompted: false, available: true, readyCount: 0 };

vi.mock('expo-store-review', () => ({
  isAvailableAsync: async () => h.available,
  requestReview: vi.fn(async () => undefined),
}));
vi.mock('../../db', () => ({
  recapsRepo: { listByStatuses: async () => Array.from({ length: h.readyCount }, (_, i) => ({ id: `r${i}` })) },
}));
vi.mock('../../lib/prefs', () => ({
  getRatingPrompted: async () => h.prompted,
  setRatingPrompted: vi.fn(async () => {
    h.prompted = true;
  }),
}));

import * as StoreReview from 'expo-store-review';

import { setRatingPrompted } from '../../lib/prefs';
import { maybeRequestReview } from './requestReview';

describe('maybeRequestReview', () => {
  beforeEach(() => {
    h.prompted = false;
    h.available = true;
    h.readyCount = 0;
    vi.clearAllMocks();
  });

  it('prompts once when eligible: available, >= 2 ready recaps, not yet prompted', async () => {
    h.readyCount = 2;
    await maybeRequestReview();
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
    expect(setRatingPrompted).toHaveBeenCalledTimes(1); // flag set so we never re-ask
  });

  it('does not prompt before the 2nd successful recap', async () => {
    h.readyCount = 1;
    await maybeRequestReview();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('does not prompt if already prompted', async () => {
    h.prompted = true;
    h.readyCount = 5;
    await maybeRequestReview();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('does not prompt when the store review API is unavailable', async () => {
    h.available = false;
    h.readyCount = 5;
    await maybeRequestReview();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });
});
