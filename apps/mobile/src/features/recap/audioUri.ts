import { Paths } from 'expo-file-system';

/** Absolute file URI for a recap's audio chunk (native recorder writes under Documents/Recaps/<id>/). */
export function chunkUri(recapId: string, relativePath: string): string {
  const base = Paths.document.uri.endsWith('/') ? Paths.document.uri : `${Paths.document.uri}/`;
  return `${base}Recaps/${recapId}/${relativePath}`;
}
