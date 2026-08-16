# Быстро Буквы

A small, adaptive tool for learning all 33 letters of the Russian Cyrillic alphabet.

## Features

- Four-choice recognition for unfamiliar letters
- Typed recall after a letter becomes familiar
- Leitner-style spaced repetition with quick retries after mistakes
- Russian example words in uppercase print, with transliterations and translations revealed after answering
- Overall mastery and accuracy tracking
- Versioned, local-only progress persistence
- Responsive and keyboard-accessible lesson UI

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
