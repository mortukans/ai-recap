import { Directory, Paths } from 'expo-file-system';

import { recapsRepo } from '../../db';

/**
 * Permanently delete a recap: DB rows (chunks/segments/artifacts/chat cascade via FK) and the audio
 * folder the native recorder wrote under Documents/Recaps/<id>/. Audio removal is best-effort — a
 * missing folder must never block the delete.
 */
export async function deleteRecapCompletely(recapId: string): Promise<void> {
  await recapsRepo.deleteRecap(recapId);
  try {
    const dir = new Directory(Paths.document, 'Recaps', recapId);
    if (dir.exists) dir.delete();
  } catch {
    /* audio folder already gone or locked; DB row is the source of truth */
  }
}
