# Быстро Буквы

A local-first collection of adaptive games for learning Russian Cyrillic, letter sounds, and beginner vocabulary.

## Games

### Alphabet Trainer

- Four-choice recognition for unfamiliar letters
- Typed recall after a letter becomes familiar
- Six uppercase Russian examples per letter
- English pronunciation guidance and IPA hints for all 33 letters
- A dedicated per-letter progress screen

### Word Match

- 24 useful beginner words drawn from the alphabet examples
- Russian-to-English meaning retrieval
- Four-choice recognition that graduates to typed recall
- Russian word playback and post-answer transliteration
- Independent adaptive progress and quick retries after mistakes

### Listen & Pick

- Explicit Russian letter-name playback before answering
- Four confusable Cyrillic choices for every letter
- Keyboard shortcuts and immediate corrective feedback
- Adaptive retries, scheduled reviews, and weakest-letter practice
- A visual-practice fallback when Russian browser speech is unavailable

### Word Builder

- English-to-Russian productive spelling with Cyrillic tiles
- Transliteration scaffolds that fade as words become familiar
- Repeated-letter handling, distractors, and weakest-word practice

### Word Dictation

- Explicit Russian word playback before answering
- Sound-to-spelling retrieval with Cyrillic tiles
- Increasing distractors and fading transliteration support

### Sentence Builder

- 24 beginner sentences assembled from Russian word tiles
- English and early transliteration scaffolds
- Fixed punctuation, syntax retrieval, and complete-sentence playback

### Phrase Gap

- 24 contextual cloze prompts
- Four-choice recognition that graduates to typed Cyrillic or Latin recall
- Completed-sentence feedback and post-answer audio

### Mini Dialogues

- 18 everyday conversational situations
- Natural Russian response selection with fading translations
- Prompt and reply playback plus pragmatic explanations

### Reading Sprint

- A 60-word Cyrillic decoding deck derived from alphabet examples
- Timed 45-second sprints and untimed 20-card rounds
- Accuracy, combo scoring, personal bests, and adaptive weak-word selection

The Games home screen makes all nine games directly selectable. Every game keeps independent, versioned progress.

## Learning design

All games emphasize retrieval rather than passive repetition. Corrective feedback is immediate, missed items return quickly, and successful items move to longer review intervals. Recognition prompts graduate to more demanding recall where appropriate.

This design follows findings on testing, feedback, and spacing in vocabulary learning, including [Belardi et al. (2021)](https://doi.org/10.3389/fpsyg.2021.757262) and [Kang et al. (2013)](https://doi.org/10.3758/s13423-013-0450-z).

## Audio design

Audio is isolated behind `useRussianSpeech`. It uses the browser's Web Speech API and explicitly selects a Russian voice when one is installed. Playback controls explain when a browser or Russian system voice is unavailable.

The Deepgram Aura TTS API is not used because its current supported-language list does not include Russian. An API-backed provider can replace the hook later without changing lesson components. API credentials must never be added to client-side code.

## Project structure

```text
src/
  components/
    common/       Shared controls such as audio and theme buttons
    games/        Game-selection home screen
    layout/       Application-level navigation and header components
    lesson/       Alphabet Trainer question and feedback UI
    listening/    Listen & Pick game
    progress/     Detailed alphabet progress presentation
    vocabulary/   Word Match game
  data/           Typed alphabet and vocabulary content
  games/          Six standalone spelling, sentence, dialogue, and fluency games
  hooks/          Persistence, theme, sessions, and speech boundaries
  learning/       Pure scheduling, grading, choices, and progress functions
  styles/         Design tokens, themes, and application styles
  test/           Shared test setup
  utils/          Small provider-independent utilities
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

Progress is versioned, local-only, and stored under separate browser keys:

- `bystro-bukvy-progress-v1`
- `bystro-bukvy-vocabulary-progress-v1`
- `bystro-bukvy-listening-progress-v1`
- `bystro-bukvy-word-builder-progress-v1`
- `bystro-bukvy-word-dictation-progress-v1`
- `bystro-bukvy-sentence-builder-progress-v1`
- `bystro-bukvy-phrase-gap-progress-v1`
- `bystro-bukvy-mini-dialogues-progress-v1`
- `bystro-bukvy-reading-sprint-progress-v1`

No account or backend is required.
