import { existsSync } from 'node:fs';
import { getConfig } from './src/config.mjs';
import { loadDataset } from './src/dataset.mjs';
import { costUsd } from './src/pricing.mjs';
import { buildProviders } from './src/providers/index.mjs';
import { printAndWriteReport } from './src/report.mjs';
import { cer, pct, wer } from './src/scoring.mjs';

function usage() {
  console.log(`
AI Recap — transcription benchmark (M2-2)

Usage:
  node run.mjs [options]

Options:
  --providers openai,deepgram,speechmatics   Limit to these (default: all with a key in .env)
  --dataset <path>            Manifest (default: dataset/manifest.json)
  --language <code>           Base language for Speechmatics/single-lang (default: lv)
  --openai-model <id>         whisper-1 | gpt-4o-transcribe | gpt-4o-mini-transcribe (default: whisper-1)
  --deepgram-model <id>       nova-3 (default) | nova-2
  --strip-diacritics          Fold Latvian diacritics when scoring (isolates diacritic-only errors)
  --out <dir>                 Output dir (default: results)
  --selftest                  Verify scoring works (no keys/audio needed)
  --help                      This help

Keys come from tools/transcription-benchmark/.env (see .env.example).
`);
}

function selftest() {
  const ref = 'labrīt sāksim ar Sales7 integrāciju un PIM datu plūsmu';
  const hyp = 'labrit saksim ar sales7 integraciju un pim datu plusmu';
  const w = wer(ref, hyp);
  const c = cer(ref, hyp);
  const wFolded = wer(ref, hyp, { stripDiacritics: true });
  console.log('Scoring self-test');
  console.log(`  WER (strict)          : ${pct(w.wer)}  (S=${w.S} D=${w.D} I=${w.I} / ref=${w.refLen})`);
  console.log(`  CER (strict)          : ${pct(c.cer)}`);
  console.log(`  WER (diacritics folded): ${pct(wFolded.wer)}`);
  const ok = w.wer > 0 && wFolded.wer < w.wer;
  console.log(ok ? '  OK ✓ (diacritic folding reduces WER as expected)' : '  CHECK — unexpected result');
  process.exit(ok ? 0 : 1);
}

async function main() {
  const config = getConfig();
  if (config.help) return usage();
  if (config.selftest) return selftest();

  const providers = buildProviders(config);
  if (providers.length === 0) {
    console.error('No providers configured. Add keys to .env, or pass --providers with a configured key.');
    process.exit(1);
  }
  if (!existsSync(config.datasetPath)) {
    console.error(`Dataset not found: ${config.datasetPath}\nSee dataset/manifest.example.json to create one.`);
    process.exit(1);
  }
  const dataset = loadDataset(config.datasetPath);
  if (dataset.length === 0) {
    console.error('Dataset is empty.');
    process.exit(1);
  }

  console.log(`Providers: ${providers.map((p) => p.name).join(', ')} · ${dataset.length} file(s)`);

  const results = [];
  for (const p of providers) {
    console.log(`\n▶ ${p.name} (${p.model})`);
    let sumNum = 0;
    let sumRef = 0;
    let sumCerNum = 0;
    let sumCerRef = 0;
    let totalCost = 0;
    let costKnown = false;
    let ok = 0;
    let err = 0;
    let modelKey = `${p.name}:${p.model}`;
    const files = [];

    for (const entry of dataset) {
      if (!existsSync(entry.audioPath)) {
        console.log(`  · ${entry.id}: audio missing (${entry.audioPath})`);
        err++;
        files.push({ id: entry.id, error: 'audio missing' });
        continue;
      }
      try {
        const t0 = Date.now();
        const out = await p.run(entry.audioPath);
        modelKey = out.modelKey ?? modelKey;
        const w = wer(entry.referenceText, out.text, { stripDiacritics: config.stripDiacritics });
        const c = cer(entry.referenceText, out.text, { stripDiacritics: config.stripDiacritics });
        sumNum += w.S + w.D + w.I;
        sumRef += w.refLen;
        sumCerNum += c.S + c.D + c.I;
        sumCerRef += c.refLen;
        const cost = entry.durationSeconds != null ? costUsd(modelKey, entry.durationSeconds) : null;
        if (cost != null) {
          totalCost += cost;
          costKnown = true;
        }
        ok++;
        files.push({ id: entry.id, wer: w.wer, cer: c.cer, costUsd: cost, seconds: Math.round((Date.now() - t0) / 1000) });
        console.log(`  · ${entry.id}: WER ${pct(w.wer)}  CER ${pct(c.cer)}${cost != null ? `  $${cost.toFixed(4)}` : ''}`);
      } catch (e) {
        err++;
        files.push({ id: entry.id, error: String(e?.message ?? e) });
        console.log(`  · ${entry.id}: ERROR ${e?.message ?? e}`);
      }
    }

    results.push({
      provider: p.name,
      model: p.model,
      modelKey,
      agg: {
        wer: sumRef > 0 ? sumNum / sumRef : null,
        cer: sumCerRef > 0 ? sumCerNum / sumCerRef : null,
        totalCostUsd: costKnown ? totalCost : null,
      },
      okCount: ok,
      errCount: err,
      files,
    });
  }

  printAndWriteReport(results, config.outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
