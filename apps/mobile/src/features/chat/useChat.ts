import { type ChatMessage, isAiRecapError } from '@ai-recap/core';
import { presetContextId } from '@ai-recap/prompts';
import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_SUMMARY_MODEL, askChat, getByokLLMProvider } from '../../ai';
import type { LlmMessage } from '../../ai';
import { chatRepo, contextsRepo, recapsRepo } from '../../db';
import { newId } from '../../lib/ids';
import { getSummaryModel } from '../../lib/prefs';
import { ensureTranscript } from '../recap/ensureTranscript';

export function useChat(recapId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setMessages(await chatRepo.listMessages(recapId));
    } catch {
      /* db not ready */
    }
  }, [recapId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const send = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || sending) return;
      setError(null);
      setSending(true);

      const userMsg: ChatMessage = {
        id: newId(),
        recapId,
        role: 'user',
        content: q,
        citations: null,
        createdAt: Date.now(),
      };
      const history: LlmMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));

      try {
        await chatRepo.addMessage(userMsg);
        setMessages((m) => [...m, userMsg]);

        const recap = await recapsRepo.getRecap(recapId);
        const segments = await ensureTranscript(recapId);
        const context =
          (await contextsRepo.getContext(recap?.contextId ?? presetContextId('workMeeting'))) ?? null;
        const model = (await getSummaryModel()) ?? DEFAULT_SUMMARY_MODEL;

        const { answer, citations } = await askChat({
          context,
          meta: {
            title: recap?.title,
            detectedLanguages: recap?.detectedLanguages ?? ['lv', 'en'],
            durationSeconds: recap?.durationSeconds ?? 0,
          },
          transcript: segments,
          history,
          question: q,
          provider: getByokLLMProvider(),
          model,
        });

        const assistantMsg: ChatMessage = {
          id: newId(),
          recapId,
          role: 'assistant',
          content: answer,
          citations: citations.length > 0 ? citations : null,
          createdAt: Date.now(),
        };
        await chatRepo.addMessage(assistantMsg);
        setMessages((m) => [...m, assistantMsg]);
      } catch (e) {
        if (isAiRecapError(e) && e.code === 'llm/missing-key') setError('needKey');
        else setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSending(false);
      }
    },
    [recapId, messages, sending],
  );

  return { messages, sending, error, send };
}
