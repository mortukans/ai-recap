import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { perHourUsd } from './pricing.mjs';
import { pct } from './scoring.mjs';

function printTable(header, rows) {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');
  console.log(line(header));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(r));
}

function toMarkdown(sorted) {
  const lines = [];
  lines.push('# Transcription benchmark — latest run', '');
  lines.push(`Generated: ${new Date().toISOString()}`, '');
  lines.push('Ranked by micro-averaged WER (lower is better). CER is character error rate — a fairer');
  lines.push('signal for morphologically rich Latvian. Costs are APPROXIMATE — verify provider pricing.', '');
  lines.push('| Provider | Model | WER | CER | $/hr (list) | $ total | ok/err |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const r of sorted) {
    const hr = perHourUsd(r.modelKey);
    lines.push(
      `| ${r.provider} | ${r.model} | ${r.agg.wer === null ? '—' : pct(r.agg.wer)} | ${
        r.agg.cer === null ? '—' : pct(r.agg.cer)
      } | ${hr === null ? '—' : `$${hr.toFixed(3)}`} | ${
        r.agg.totalCostUsd === null ? '—' : `$${r.agg.totalCostUsd.toFixed(4)}`
      } | ${r.okCount}/${r.errCount} |`,
    );
  }
  lines.push('', '## Per-file', '');
  for (const r of sorted) {
    lines.push(`### ${r.provider} (${r.model})`, '');
    lines.push('| File | WER | CER | $ | note |');
    lines.push('|---|---|---|---|---|');
    for (const f of r.files) {
      if (f.error) lines.push(`| ${f.id} | — | — | — | ${f.error} |`);
      else lines.push(`| ${f.id} | ${pct(f.wer)} | ${pct(f.cer)} | ${f.costUsd == null ? '—' : `$${f.costUsd.toFixed(4)}`} |  |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function printAndWriteReport(results, outDir) {
  const sorted = [...results].sort((a, b) => (a.agg.wer ?? 2) - (b.agg.wer ?? 2));

  console.log('\n=== Transcription benchmark (ranked by WER) ===\n');
  printTable(
    ['Provider', 'Model', 'WER', 'CER', '$/hr', '$ total', 'ok/err'],
    sorted.map((r) => [
      r.provider,
      r.model,
      r.agg.wer === null ? '—' : pct(r.agg.wer),
      r.agg.cer === null ? '—' : pct(r.agg.cer),
      perHourUsd(r.modelKey) === null ? '—' : `$${perHourUsd(r.modelKey).toFixed(3)}`,
      r.agg.totalCostUsd === null ? '—' : `$${r.agg.totalCostUsd.toFixed(4)}`,
      `${r.okCount}/${r.errCount}`,
    ]),
  );

  mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(resolve(outDir, `results-${ts}.json`), JSON.stringify(results, null, 2));
  writeFileSync(resolve(outDir, 'latest.md'), toMarkdown(sorted));
  console.log(`\nWrote results/results-${ts}.json and results/latest.md`);
}
