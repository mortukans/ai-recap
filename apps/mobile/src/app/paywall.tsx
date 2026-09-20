/**
 * Paywall (MVP task M5-1). Two products, both via RevenueCat/StoreKit:
 *   • Unlimited — monthly subscription: hosted AI, 60-min recordings, no daily cap
 *   • BYOK lifetime — one-time: bring your own OpenRouter key, 60-min recordings, export, advanced templates
 * Prices come from the store (localized), never hard-coded.
 */
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '../design/useTheme';
import { applyEntitlements, refreshEntitlements } from '../purchases/entitlements';
import {
  PRODUCT_BYOK_LIFETIME,
  PRODUCT_UNLIMITED_MONTHLY,
  getCurrentOffering,
  isPurchasesConfigured,
  purchase,
  restore,
} from '../purchases/revenuecat';
import { useCapabilities } from '../purchases/useCapabilities';

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const th = useTheme();
  const caps = useCapabilities();

  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const offering = await getCurrentOffering();
      setPackages(offering?.availablePackages ?? []);
    })();
  }, []);

  const find = (productId: string) => packages?.find((p) => p.product.identifier === productId) ?? null;
  const unlimited = find(PRODUCT_UNLIMITED_MONTHLY);
  const byok = find(PRODUCT_BYOK_LIFETIME);

  const buy = async (pkg: PurchasesPackage | null) => {
    if (!pkg) return;
    setMessage(null);
    setBusy(pkg.identifier);
    try {
      const result = await purchase(pkg);
      if (result) {
        applyEntitlements(result);
        void refreshEntitlements();
        setMessage(t('paywall.thanks'));
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    setMessage(null);
    setBusy('restore');
    try {
      applyEntitlements(await restore());
      await refreshEntitlements();
      setMessage(t('paywall.restored'));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const Plan = ({
    title,
    price,
    features,
    pkg,
    owned,
    highlight,
  }: {
    title: string;
    price: string;
    features: string[];
    pkg: PurchasesPackage | null;
    owned: boolean;
    highlight?: boolean;
  }) => (
    <View style={[styles.card, { backgroundColor: c.backgroundElement, borderColor: highlight ? th.accent : th.line, borderWidth: 1 }]}>
      <Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text>
      <Text style={[styles.price, { color: c.text }]}>{price}</Text>
      {features.map((f) => (
        <View key={f} style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={18} color={th.accentText} />
          <Text style={[styles.feature, { color: c.text }]}>{f}</Text>
        </View>
      ))}
      <Pressable
        disabled={owned || !pkg || busy !== null}
        onPress={() => void buy(pkg)}
        style={[styles.buy, { backgroundColor: owned ? c.backgroundSelected : th.primaryBtn, opacity: !pkg && !owned ? 0.5 : 1 }]}>
        {busy === pkg?.identifier ? (
          <ActivityIndicator color={th.onPrimaryBtn} />
        ) : (
          <Text style={[styles.buyText, { color: owned ? c.text : th.onPrimaryBtn }]}>
            {owned ? t('paywall.owned') : pkg ? t('paywall.buy') : t('paywall.unavailable')}
          </Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: t('paywall.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.lead, { color: c.textSecondary }]}>{t('paywall.lead')}</Text>

        {packages === null ? (
          <ActivityIndicator color={c.textSecondary} />
        ) : !isPurchasesConfigured() ? (
          <Text style={[styles.note, { color: c.textSecondary }]}>{t('paywall.notConfigured')}</Text>
        ) : null}

        <Plan
          title={t('paywall.unlimitedTitle')}
          price={unlimited?.product.priceString ? t('paywall.perMonth', { price: unlimited.product.priceString }) : '—'}
          features={[t('paywall.f.hosted'), t('paywall.f.sixty'), t('paywall.f.noCap'), t('paywall.f.export')]}
          pkg={unlimited}
          owned={caps.hostedLLM && caps.maxRecapsPerDay === null}
          highlight
        />
        <Plan
          title={t('paywall.byokTitle')}
          price={byok?.product.priceString ? t('paywall.oneTime', { price: byok.product.priceString }) : '—'}
          features={[t('paywall.f.byok'), t('paywall.f.sixty'), t('paywall.f.export'), t('paywall.f.templates')]}
          pkg={byok}
          owned={caps.byokEnabled}
        />

        {message ? <Text style={[styles.note, { color: c.textSecondary }]}>{message}</Text> : null}

        <Pressable onPress={() => void onRestore()} disabled={busy !== null} style={styles.link}>
          {busy === 'restore' ? (
            <ActivityIndicator color={c.textSecondary} />
          ) : (
            <Text style={[styles.linkText, { color: c.textSecondary }]}>{t('paywall.restore')}</Text>
          )}
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.link}>
          <Text style={[styles.linkText, { color: c.textSecondary }]}>{t('paywall.notNow')}</Text>
        </Pressable>
        <Text style={[styles.legal, { color: c.textSecondary }]}>{t('paywall.legal')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  lead: { fontSize: 15, lineHeight: 22 },
  card: { borderRadius: 16, padding: Spacing.four, gap: Spacing.two, borderWidth: 2 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  price: { fontSize: 28, fontWeight: '700', marginBottom: Spacing.one },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  feature: { fontSize: 15 },
  buy: { marginTop: Spacing.two, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buyText: { fontSize: 16, fontWeight: '600' },
  note: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  link: { alignItems: 'center', paddingVertical: Spacing.two },
  linkText: { fontSize: 14 },
  legal: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: Spacing.two },
});
