/**
 * Text normalization + WER/CER scoring. Pure functions, no dependencies.
 * Latvian diacritics (ā č ē ģ ī ķ ļ ņ š ū ž) are preserved by default; pass stripDiacritics to fold
 * them (useful to separate "wrong word" from "missing diacritic" errors).
 */

const DIACRITIC_MAP = {
  ā: 'a', č: 'c', ē: 'e', ģ: 'g', ī: 'i', ķ: 'k', ļ: 'l', ņ: 'n', š: 's', ū: 'u', ž: 'z',
};

export function normalize(text, { stripDiacritics = false } = {}) {
  let t = (text ?? '').toLowerCase();
  if (stripDiacritics) {
    t = t.replace(/[āčēģīķļņšūž]/g, (ch) => DIACRITIC_MAP[ch] ?? ch);
  }
  // Remove punctuation (keep letters incl. diacritics, digits, whitespace).
  t = t.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

export function tokenizeWords(text) {
  const n = normalize(text);
  return n.length === 0 ? [] : n.split(' ');
}

/** Levenshtein alignment with S/D/I/C breakdown via backtrace. `ref`/`hyp` are token arrays. */
export function align(ref, hyp) {
  const n = ref.length;
  const m = hyp.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  let i = n;
  let j = m;
  let S = 0;
  let D = 0;
  let I = 0;
  let C = 0;
  while (i > 0 || j > 0) {
    const sub = i > 0 && j > 0 ? dp[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1) : Infinity;
    const del = i > 0 ? dp[i - 1][j] + 1 : Infinity;
    if (i > 0 && j > 0 && dp[i][j] === sub) {
      if (ref[i - 1] === hyp[j - 1]) C++;
      else S++;
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === del) {
      D++;
      i--;
    } else {
      I++;
      j--;
    }
  }
  return { S, D, I, C, refLen: n, distance: dp[n][m] };
}

export function wer(refText, hypText, opts) {
  const ref = tokenizeWords(opts?.stripDiacritics ? normalize(refText, opts) : refText);
  const hyp = tokenizeWords(opts?.stripDiacritics ? normalize(hypText, opts) : hypText);
  const a = align(ref, hyp);
  return { ...a, wer: a.refLen === 0 ? (hyp.length === 0 ? 0 : 1) : (a.S + a.D + a.I) / a.refLen };
}

export function cer(refText, hypText, opts) {
  const ref = [...normalize(refText, opts).replace(/ /g, '')];
  const hyp = [...normalize(hypText, opts).replace(/ /g, '')];
  const a = align(ref, hyp);
  return { ...a, cer: a.refLen === 0 ? (hyp.length === 0 ? 0 : 1) : (a.S + a.D + a.I) / a.refLen };
}

export function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}
