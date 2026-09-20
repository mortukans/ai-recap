/**
 * Shared "start a recording" gate (Free daily quota → server slot → /recording). Used by the floating
 * tab bar's record button and anything else that starts a recap.
 */
import { dailyQuotaState, startOfDay } from '@ai-recap/core';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { recapsRepo } from '../../db';
import { processingCoordinator } from '../../processing/coordinator';
import { consumeQuota } from '../../purchases/quota';
import { useCapabilities } from '../../purchases/useCapabilities';

export function useStartRecording() {
  const { t } = useTranslation();
  const router = useRouter();
  const caps = useCapabilities();
  const [startedToday, setStartedToday] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setStartedToday(await recapsRepo.countStartedSince(startOfDay(Date.now())));
    } catch {
      setStartedToday(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return processingCoordinator.onChange(() => void refresh());
  }, [refresh]);

  const quota = dailyQuotaState(startedToday, caps.maxRecapsPerDay);

  const showLimit = useCallback(() => {
    Alert.alert(t('free.limitTitle'), t('free.limitMsg', { max: caps.maxRecapsPerDay ?? 0 }), [
      { text: t('home.cancel'), style: 'cancel' },
      { text: t('free.upgrade'), onPress: () => router.push('/paywall') },
    ]);
  }, [t, caps.maxRecapsPerDay, router]);

  const start = useCallback(async () => {
    if (!quota.canStart) {
      showLimit();
      return;
    }
    // Server-side slot (anti-tamper) when the backend is configured; the local count is the UX.
    const decision = await consumeQuota(caps.maxRecapsPerDay);
    if (!decision.allowed) {
      if (decision.startedToday !== null) setStartedToday(decision.startedToday);
      showLimit();
      return;
    }
    router.push('/recording');
  }, [quota.canStart, caps.maxRecapsPerDay, router, showLimit]);

  return { start, quota, refresh };
}
