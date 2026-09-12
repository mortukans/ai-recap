import { transcribeDeepgram } from './deepgram.mjs';
import { transcribeOpenAI } from './openai.mjs';
import { transcribeSpeechmatics } from './speechmatics.mjs';

/** Build the list of providers to run: only those with a key, filtered by --providers if given. */
export function buildProviders(config) {
  const all = [];
  if (config.keys.openai) {
    all.push({
      name: 'openai',
      model: config.openaiModel,
      run: (p) => transcribeOpenAI(p, { apiKey: config.keys.openai, model: config.openaiModel }),
    });
  }
  if (config.keys.deepgram) {
    all.push({
      name: 'deepgram',
      model: config.deepgramModel,
      run: (p) => transcribeDeepgram(p, { apiKey: config.keys.deepgram, model: config.deepgramModel }),
    });
  }
  if (config.keys.speechmatics) {
    all.push({
      name: 'speechmatics',
      model: 'standard',
      run: (p) => transcribeSpeechmatics(p, { apiKey: config.keys.speechmatics, language: config.language }),
    });
  }
  return config.requestedProviders
    ? all.filter((p) => config.requestedProviders.includes(p.name))
    : all;
}
