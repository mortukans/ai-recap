import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Minimal .env loader (no dependency). Existing process.env wins. */
function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

/** Parse `--flag value` / `--flag` / `--flag=value` argv. */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq >= 0) {
      args[a.slice(2, eq)] = a.slice(eq + 1);
    } else {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[a.slice(2)] = next;
        i++;
      } else {
        args[a.slice(2)] = true;
      }
    }
  }
  return args;
}

export function getConfig(argv = process.argv.slice(2)) {
  loadEnv();
  const args = parseArgs(argv);

  const requested =
    typeof args.providers === 'string' ? args.providers.split(',').map((s) => s.trim()) : null;

  return {
    root: ROOT,
    selftest: Boolean(args.selftest),
    help: Boolean(args.help || args.h),
    datasetPath: resolve(ROOT, String(args.dataset ?? 'dataset/manifest.json')),
    outDir: resolve(ROOT, String(args.out ?? 'results')),
    language: String(args.language ?? 'lv'),
    stripDiacritics: Boolean(args['strip-diacritics']),
    openaiModel: String(args['openai-model'] ?? 'whisper-1'),
    deepgramModel: String(args['deepgram-model'] ?? 'nova-3'),
    requestedProviders: requested,
    keys: {
      openai: process.env.OPENAI_API_KEY || null,
      deepgram: process.env.DEEPGRAM_API_KEY || null,
      speechmatics: process.env.SPEECHMATICS_API_KEY || null,
    },
  };
}
