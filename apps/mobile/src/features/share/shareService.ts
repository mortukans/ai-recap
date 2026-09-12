/**
 * Sharing/export (Product Plan §36A).
 * - shareText: normal share sheet (formatted recap) → Notes/Mail/Messages/etc.
 * - exportTextFile: a separate explicit file export (transcript / recap .md) the owner can Save to Files.
 * Audio and full transcripts are never part of the normal recap share.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

export async function shareText(message: string, title?: string): Promise<void> {
  await Share.share(title ? { message, title } : { message });
}

export async function exportTextFile(
  filename: string,
  content: string,
  mimeType: string,
  uti: string,
): Promise<void> {
  const file = new File(Paths.cache, filename);
  try {
    file.create();
  } catch {
    // Already exists — we'll overwrite via write().
  }
  file.write(content);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle: filename });
  } else {
    await Share.share({ message: content });
  }
}

export const MARKDOWN = { mime: 'text/markdown', uti: 'net.daringfireball.markdown' };
export const PLAINTEXT = { mime: 'text/plain', uti: 'public.plain-text' };

/** Filesystem-safe filename from a recap title. */
export function safeFilename(title: string, fallback = 'recap'): string {
  const base = title.trim().replace(/[^\p{L}\p{N}\-_ ]/gu, '').replace(/\s+/g, '-').slice(0, 60);
  return base.length > 0 ? base : fallback;
}
