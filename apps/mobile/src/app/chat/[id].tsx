import { formatTimestamp } from '@ai-recap/core';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useChat } from '../../features/chat/useChat';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { messages, sending, error, send } = useChat(id ?? '');
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const onSend = async () => {
    const q = input;
    setInput('');
    await send(q);
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: t('chat.title') }} />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.length === 0 ? (
            <Text style={[styles.empty, { color: c.textSecondary }]}>{t('chat.empty')}</Text>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <View
                  key={m.id}
                  style={[
                    styles.bubble,
                    isUser
                      ? { alignSelf: 'flex-end', backgroundColor: '#208AEF' }
                      : { alignSelf: 'flex-start', backgroundColor: c.backgroundElement },
                  ]}>
                  <Text style={[styles.bubbleText, { color: isUser ? '#fff' : c.text }]}>{m.content}</Text>
                  {!isUser && m.citations && m.citations.length > 0 ? (
                    <View style={styles.chipRow}>
                      {m.citations.map((s, i) => (
                        <Text
                          key={`${s}-${i}`}
                          style={[styles.chip, { color: c.textSecondary, backgroundColor: c.backgroundSelected }]}>
                          {formatTimestamp(s)}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
          {sending ? <ActivityIndicator style={styles.typing} color={c.textSecondary} /> : null}
          {error ? (
            <Text style={[styles.err, { color: '#E5484D' }]}>{error === 'needKey' ? t('chat.needKey') : error}</Text>
          ) : null}
        </ScrollView>

        <View style={[styles.inputBar, { borderTopColor: c.backgroundElement, backgroundColor: c.background }]}>
          <TextInput
            placeholder={t('chat.placeholder')}
            placeholderTextColor={c.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text }]}
          />
          <Pressable
            onPress={onSend}
            disabled={sending || input.trim().length === 0}
            style={[styles.sendBtn, { opacity: sending || input.trim().length === 0 ? 0.4 : 1 }]}>
            <Ionicons name="arrow-up" color="#fff" size={22} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.two, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: Spacing.five, fontSize: 15 },
  bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.one },
  chip: { fontSize: 12, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  typing: { alignSelf: 'flex-start', margin: Spacing.two },
  err: { fontSize: 13, margin: Spacing.two },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, padding: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 20, paddingHorizontal: Spacing.three, paddingTop: 12, paddingBottom: 12 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#208AEF', alignItems: 'center', justifyContent: 'center' },
});
