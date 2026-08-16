# Быстро Буквы

An adaptive tool for learning all 33 letters of the Russian Cyrillic alphabet.

## Features

- Four-choice recognition for unfamiliar letters
- Typed recall after a letter becomes familiar
- Leitner-style spaced repetition with quick retries after mistakes
- Six uppercase Russian examples per letter
- English pronunciation guidance and IPA hints for every letter
- Russian letter-name and example-word playback with an installed `ru-RU` browser voice
- Transliterations and translations revealed after answering
- Dedicated per-letter progress screen
- Persistent light and dark themes
- Versioned, local-only learning progress
- Responsive, keyboard-accessible lesson UI

## Audio design

Audio is isolated behind `useRussianSpeech`. It uses the browser's Web Speech API and explicitly selects a Russian voice when one is installed. Playback controls explain when a browser or Russian system voice is unavailable.

The Deepgram Aura TTS API is not used because its current supported-language list does not include Russian. An API-backed provider can replace the hook later without changing lesson components. API credentials must never be added to client-side code.

## Project structure

```text
src/
  components/
    common/      Shared controls such as audio and theme buttons
    layout/      Application-level navigation and header components
    lesson/      Question, feedback, examples, and pronunciation UI
    progress/    Detailed progress presentation
  data/          Typed alphabet learning content
  hooks/         Persistence, theme, session, and speech boundaries
  learning/      Pure scheduling, grading, and progress functions
  styles/        Design tokens, themes, and application styles
  test/          Shared test setup
  utils/         Small provider-independent utilities
```

Learning and scheduling logic remains in pure functions so it can be tested independently from React. Browser and persistence side effects are contained in hooks.

## Development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm test
npm run build
```

Progress is stored in the browser under `bystro-bukvy-progress-v1`. No account or backend is required.
