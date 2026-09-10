export const en = {
  app: { name: 'AI Recap' },
  tabs: { recaps: 'Recaps', contexts: 'Contexts', settings: 'Settings' },
  home: {
    startRecap: 'Start Recap',
    recent: 'Recent',
    empty: 'No recaps yet. Tap Start Recap to record your first meeting.',
    searchPlaceholder: 'Search recaps',
  },
  recording: {
    recording: 'Recording',
    paused: 'Paused',
    pause: 'Pause',
    resume: 'Resume',
    finish: 'Finish',
    savedContinuously: 'Audio saved continuously',
    permissionNeeded: 'Microphone access is required to record.',
    grantPermission: 'Grant microphone access',
  },
  contexts: {
    title: 'Contexts',
    empty: 'No custom contexts yet.',
    builtIn: 'Built-in',
    newContext: 'New context',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    languageAuto: 'Auto (LV + EN)',
    plan: 'Plan',
    planFree: 'Free',
    recording: 'Recording',
    chunkDuration: 'Chunk duration',
    audioQuality: 'Audio quality',
    privacy: 'Privacy',
    about: 'About',
  },
  status: {
    recording: 'Recording',
    recorded: 'Recorded',
    waitingForNetwork: 'Waiting for internet',
    transcribing: 'Transcribing…',
    transcribed: 'Transcribed',
    summarizing: 'Summarizing…',
    ready: 'Ready',
    transcriptionFailed: 'Transcription failed',
    summaryFailed: 'Summary failed',
    uploadFailed: 'Upload failed',
  },
};

export type TranslationKeys = typeof en;
export default en;
