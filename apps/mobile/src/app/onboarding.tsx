/**
 * First-launch onboarding (Product Plan §36 / MVP task M5-4 "guided setup"). Three honest choices:
 * continue Free (Apple on-device transcription, English-centric), bring an OpenRouter key (Latvian +
 * English, your own account), or see the paid plans. Shown once; Settings covers everything later.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '../design/useTheme';
import { setOnboarded } from '../lib/prefs';
import { setOpenRouterKey } from '../security/byok-store';

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const th = useTheme();
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);

  const finish = async (then?: () => void) => {
    await setOnboarded();
    router.back();
    then?.();
  };

  const saveKey = async () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await setOpenRouterKey(trimmed);
      await finish();
    } finally {
      setSaving(false);
    }
  };

  const Step = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => (
    <View style={styles.step}>
      <Ionicons name={icon} size={22} color={th.accentText} />
      <Text style={[styles.stepText, { color: c.text }]}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.h1, { color: c.text }]}>{t('onboarding.title')}</Text>
        <Text style={[styles.lead, { color: c.textSecondary }]}>{t('onboarding.lead')}</Text>

        <View style={[styles.card, { backgroundColor: c.backgroundElement, borderColor: th.line }]}>
          <Step icon="mic-outline" text={t('onboarding.step1')} />
          <Step icon="text-outline" text={t('onboarding.step2')} />
          <Step icon="sparkles-outline" text={t('onboarding.step3')} />
          <Step icon="watch-outline" text={t('onboarding.step4')} />
        </View>

        <Text style={[styles.h2, { color: c.text }]}>{t('onboarding.chooseTitle')}</Text>

        <View style={[styles.card, { backgroundColor: c.backgroundElement, borderColor: th.line }]}>
          <Text style={[styles.optionTitle, { color: c.text }]}>{t('onboarding.byokTitle')}</Text>
          <Text style={[styles.optionText, { color: c.textSecondary }]}>{t('onboarding.byokText')}</Text>
          <TextInput
            placeholder="sk-or-..."
            placeholderTextColor={c.textSecondary}
            value={key}
            onChangeText={setKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={[styles.input, { backgroundColor: c.background, color: c.text, borderColor: th.line }]}
          />
          <Pressable
            onPress={() => void saveKey()}
            disabled={!key.trim() || saving}
            style={[styles.button, { backgroundColor: th.primaryBtn, opacity: key.trim() ? 1 : 0.5 }]}>
            <Text style={[styles.buttonText, { color: th.onPrimaryBtn }]}>{t('onboarding.saveKey')}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => void finish(() => router.push('/paywall'))}
          style={[styles.button, { backgroundColor: c.backgroundSelected }]}>
          <Text style={[styles.buttonText, { color: c.text }]}>{t('onboarding.seePlans')}</Text>
        </Pressable>

        <Pressable onPress={() => void finish()} style={styles.link}>
          <Text style={[styles.linkText, { color: c.textSecondary }]}>{t('onboarding.continueFree')}</Text>
        </Pressable>
        <Text style={[styles.note, { color: c.textSecondary }]}>{t('onboarding.freeNote')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, paddingTop: Spacing.six },
  h1: { fontFamily: 'Newsreader_500Medium', fontSize: 36, lineHeight: 38, letterSpacing: -0.7 },
  h2: { fontFamily: 'Newsreader_500Medium', fontSize: 22, lineHeight: 26, marginTop: Spacing.two },
  lead: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 16, lineHeight: 23 },
  card: { borderRadius: 18, padding: Spacing.four, gap: Spacing.three, borderWidth: 1 },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, flex: 1, lineHeight: 21 },
  optionTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16 },
  optionText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, lineHeight: 20 },
  input: { height: 50, borderRadius: 14, paddingHorizontal: Spacing.three, borderWidth: 1, fontFamily: 'HankenGrotesk_400Regular', fontSize: 16 },
  button: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15 },
  link: { alignItems: 'center', paddingVertical: Spacing.two },
  linkText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15 },
  note: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
