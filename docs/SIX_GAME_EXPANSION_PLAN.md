# Six-Game Expansion Plan

Status: approved implementation specification  
Baseline: `main` after commit `64b7d5e` plus this plan commit  
Goal: add six independently playable, local-first Russian learning games and deploy the integrated nine-game application to Vercel.

## 1. Product strategy

The current application trains three foundational skills:

1. **Alphabet Trainer** — visual Cyrillic-to-Latin recognition and recall.
2. **Listen & Pick** — Russian letter-name-to-Cyrillic sound-symbol mapping.
3. **Word Match** — Russian-word-to-English meaning retrieval.

The next six games deliberately move from controlled word production to connected language and then fluent reading:

1. **Word Builder** — English meaning to constructed Cyrillic spelling.
2. **Word Dictation** — spoken Russian word to constructed Cyrillic spelling.
3. **Sentence Builder** — English meaning to ordered Russian sentence.
4. **Phrase Gap** — contextual Russian cloze retrieval.
5. **Mini Dialogues** — pragmatic response selection in short conversations.
6. **Reading Sprint** — rapid Cyrillic-to-transliteration decoding for automaticity.

Together, the nine games cover visual recognition, auditory discrimination, vocabulary meaning, spelling, listening-to-spelling, syntax, contextual retrieval, pragmatic comprehension, and reading fluency. The sequence applies retrieval practice, immediate corrective feedback, spacing, interleaving, scaffold fading, and increasing productive demand. No new game requires an account, backend, external API, or server-side persistence.

## 2. Non-negotiable shared behavior

Every game must satisfy all requirements below.

### 2.1 Component and metadata contract

Each feature lives entirely under its assigned directory and exports from `index.ts`:

```ts
export interface <GameName>GameProps {
  onExit: () => void
}

export const <GAME_NAME>_INFO = {
  id: '<game-id>',
  title: '<display title>',
  kicker: '<home-card category>',
  description: '<one-sentence home-card description>',
  icon: '<short text icon>',
  strategyLabels: ['<label one>', '<label two>'],
  storageKey: '<local-storage-key>',
} as const

export function <GameName>Game({ onExit }: <GameName>GameProps) { ... }
```

The component owns its session hook and persistence. `onExit` must return to the Games home without resetting or losing the in-progress question.

### 2.2 Persistence and scheduling

Each game uses a separate localStorage document with this top-level shape:

```ts
interface GameProgress {
  version: 1
  items: Record<string, ItemProgress>
  updatedAt: number
  // Game-specific aggregate fields are permitted.
}

interface ItemProgress {
  level: number // integer 0..5
  attempts: number
  correctAttempts: number
  lastReviewedAt: number | null
  nextDueAt: number
  lastResult: 'correct' | 'incorrect' | null
}
```

Additional fields such as streak, lapses, best score, or mode are allowed when required by the game. Hydration must reject the wrong version, preserve each valid known item, replace malformed items with a fresh item, add newly introduced content, and ignore removed/unknown IDs.

Unless a game section explicitly overrides it, scheduling is:

- Maximum level: `5`.
- Correct answer: increment level by one, capped at 5.
- Incorrect answer: decrement level by one, floored at 0.
- Intervals by resulting level: `[0, 0, 10 minutes, 1 day, 3 days, 10 days]`.
- Incorrect answers are due immediately.
- Do not repeat either of the two most recently answered items when another due or unseen item is available.
- Priority: missed due items, then lowest-level due items, then oldest due time, then unseen content in authored order.
- A scheduled round ends when there are no unseen or currently due items.
- Completion offers **Practice weakest items**, selecting lowest level, then lowest accuracy, then most lapses/oldest review.
- Mastery means level 5; it does not remove an item from future scheduled review.

### 2.3 Feedback and answer integrity

- A question can be graded only once.
- Controls used to answer are disabled during feedback.
- Correct feedback states exactly what was correct.
- Incorrect feedback shows the complete correct answer and says that the item will return soon.
- Transliteration and English meaning may not reveal a hidden answer before grading unless that game level explicitly uses them as a scaffold.
- The Continue button is autofocus after grading.
- State changes are persisted immediately after each graded answer.

### 2.4 Accessibility and keyboard interaction

- Semantic `main` is supplied by `App`; each game root is a labelled `section`.
- One `h1` names the game; question prompts use `h2` or labelled groups.
- Russian content uses `lang="ru"`.
- Status feedback uses `role="status"`, `aria-live="polite"`, and `aria-atomic="true"`.
- All drag/reorder mechanics must also work through ordinary buttons; drag-and-drop may be added only as an enhancement.
- Every tile is keyboard focusable and operable with Enter/Space.
- `Escape` invokes `onExit` from question, feedback, completion, and pre-round screens.
- `Enter` checks a complete answer and continues from feedback when it does not conflict with a focused button.
- Choice games use A–D shortcuts. Ordered tile games support Backspace to remove the most recently placed tile and expose explicit Undo and Clear buttons.
- Focus returns to the primary action or first answer control on every new question.
- All layouts work at 320px width, in light/dark themes, and with reduced motion.

### 2.5 Visual implementation

- Use existing tokens from `src/styles/tokens.css`; do not hard-code a light-only palette.
- Use a unique BEM-style class prefix per game to prevent cross-feature collisions.
- Import the game stylesheet from the game component so integration requires no shared CSS edit.
- Match existing paper cards, teal primary actions, coral error feedback, gold listening/attention cues, serif Russian display text, and existing focus-ring behavior.
- Do not modify `src/styles/app.css` in a feature branch.

### 2.6 Quality gate

Each feature branch must include:

- Pure-function tests for content validation, choice/tile generation, grading, scheduling, and hydration.
- At least three component tests: happy path, incorrect feedback/persistence, and keyboard/accessibility or completion/practice.
- No warnings from `npm run lint`.
- Passing `npm test` and `npm run build` after `npm ci`.
- No new runtime or development dependency.
- No edits outside the assigned feature directory.
- One final branch commit with a clean worktree.

## 3. Game 1 — Word Builder

### 3.1 Learning objective

Convert known English meanings into correctly ordered Cyrillic spellings. This is the productive inverse of Word Match and removes the Russian-keyboard barrier by using letter tiles.

### 3.2 Ownership and exports

- Branch: `game/word-builder`
- Worktree: `/Users/t6t/src/russian-alph-word-builder`
- Directory owned: `src/games/word-builder/**`
- Component: `WordBuilderGame`
- ID: `word-builder`
- Home kicker: `Words · Spelling`
- Home description: `Build useful Russian words from Cyrillic letter tiles.`
- Icon: `дом`
- Strategy labels: `Active production`, `Scaffold fading`
- Storage key: `bystro-bukvy-word-builder-progress-v1`
- CSS prefix: `word-builder__`

### 3.3 Content

Use all 24 records from `VOCABULARY` in authored order. Do not duplicate or alter `src/data/vocabulary.ts`. Each target answer is `word.russian`; prompt meaning is `word.english`; post-answer support uses `word.latin`; playback uses `word.russian`.

Every Cyrillic character is a separate tile. Repeated letters receive stable occurrence IDs such as `mama-м-0` and `mama-м-1`; grading compares only the ordered character values. The game is case-insensitive but displays lowercase.

### 3.4 Question modes by pre-answer level

- Levels 0–1: show English meaning and Latin transliteration; provide only the exact answer letters, shuffled.
- Levels 2–3: show English meaning only; provide only the exact answer letters, shuffled.
- Levels 4–5: show English meaning only; provide exact answer letters plus two distractor characters.

Distractors are selected deterministically from the union of characters in the target word's three `distractorIds`, excluding target characters until unique options are exhausted. If fewer than two are available, fill from `абвгдежзийклмнопрстуфхцчшщыэюя`. A distractor occurrence is used at most once. Shuffle with an injectable random function. If shuffled answer letters accidentally match the target order, rotate the bank left once.

### 3.5 Interaction

- Header shows game name, mastered count, overall level percentage, and Exit.
- Prompt: `Build the Russian word for:` followed by the English meaning.
- Optional scaffold line at levels 0–1: `Sounds like: <latin>`.
- Empty answer slots equal target length.
- Clicking a bank tile appends it to the first empty slot and disables that tile.
- Clicking a placed tile returns it to the bank while preserving the relative order of remaining placed tiles.
- Undo removes the last placed tile; Clear returns all tiles.
- Check is enabled only when every slot is filled.
- Enter checks; Backspace undoes.
- Correct feedback: `<russian> · <latin> means <english>.`
- Incorrect feedback shows the learner's order, the correct Cyrillic word, transliteration, and meaning.
- Feedback includes Russian TTS playback using `useRussianSpeech`; audio is supplementary and never required to answer.

### 3.6 Tests and completion

Tests must prove repeated letters remain independently selectable, accidental solved shuffles are prevented, level scaffolds fade exactly as specified, two distractors appear only at levels 4–5, synonyms never affect spelling grading, misses become immediately due, keyboard Undo/Check works, persistence is separate, and weakest-item practice starts from completion.

## 4. Game 2 — Word Dictation

### 4.1 Learning objective

Map a complete spoken Russian word to its Cyrillic spelling. Unlike Word Builder, neither English meaning nor written Russian is visible before grading.

### 4.2 Ownership and exports

- Branch: `game/word-dictation`
- Worktree: `/Users/t6t/src/russian-alph-word-dictation`
- Directory owned: `src/games/word-dictation/**`
- Component: `WordDictationGame`
- ID: `word-dictation`
- Home kicker: `Words · Listening`
- Home description: `Hear a Russian word and spell it with Cyrillic tiles.`
- Icon: `🔊`
- Strategy labels: `Listening retrieval`, `Sound-to-spelling`
- Storage key: `bystro-bukvy-word-dictation-progress-v1`
- CSS prefix: `word-dictation__`

### 4.3 Content

Use the same 24 `VOCABULARY` records. Audio text is `word.russian`. The hidden answer is lowercase `word.russian`. Meaning and transliteration remain hidden until feedback except for the low-level transliteration scaffold defined below.

Tile occurrence IDs, repeated-letter handling, solved-shuffle prevention, and deterministic random injection follow Word Builder.

### 4.4 Question modes by pre-answer level

- Levels 0–1: audio plus Latin transliteration; exact answer letters plus one distractor.
- Levels 2–3: audio only; exact answer letters plus two distractors.
- Levels 4–5: audio only; exact answer letters plus three distractors.

Distractors use the same target-distractor-word character algorithm as Word Builder. The UI shows answer length through empty slots; it never shows a first-letter hint.

### 4.5 Interaction and audio gating

- Prompt: `Listen, then spell the word.`
- Choices and tile controls are disabled until the learner explicitly presses **Play word** at least once for that question.
- Replay is unlimited and uses `useRussianSpeech` with `word.russian` at the existing learning rate.
- The keyboard shortcut `L` plays/replays audio.
- Tile placement, removal, Undo, Clear, Enter, and Backspace match Word Builder.
- If Web Speech or a usable Russian voice is unavailable, show a non-gradable unavailable panel explaining how to install/enable Russian speech, plus Exit. Do not reveal the target or offer visual substitution because that would cease to be dictation.
- Correct feedback reveals Russian, transliteration, and English.
- Incorrect feedback reveals the learner order and complete answer, and offers replay while feedback is visible.

### 4.6 Tests and completion

Tests must install a speech mock and prove no autoplay occurs, answering is locked before playback, `L` unlocks the question, each level has the exact scaffold/distractor count, repeated letters work, unavailable speech cannot grade, misses retry after the two-item gap, storage hydration repairs malformed data, and completion offers weakest-word practice.

## 5. Game 3 — Sentence Builder

### 5.1 Learning objective

Construct beginner Russian sentences in correct word order from an English meaning. This introduces syntax without requiring Cyrillic typing.

### 5.2 Ownership and exports

- Branch: `game/sentence-builder`
- Worktree: `/Users/t6t/src/russian-alph-sentence-builder`
- Directory owned: `src/games/sentence-builder/**`
- Component: `SentenceBuilderGame`
- ID: `sentence-builder`
- Home kicker: `Sentences · Word order`
- Home description: `Arrange Russian words into complete beginner sentences.`
- Icon: `Я →`
- Strategy labels: `Sentence production`, `Syntax retrieval`
- Storage key: `bystro-bukvy-sentence-builder-progress-v1`
- CSS prefix: `sentence-builder__`

### 5.3 Authored content

Create exactly these 24 records in the listed order. Each record stores `id`, `tokens` (without final punctuation), `russian`, `latin`, `english`, and `distractor`. Use these exact Russian and English strings; provide the shown transliteration.

| ID | Russian | Transliteration | English | Level 4–5 distractor |
|---|---|---|---|---|
| sb-01 | Это дом. | Eto dom. | This is a house. | книга |
| sb-02 | Это моя мама. | Eto moya mama. | This is my mother. | папа |
| sb-03 | Это мой папа. | Eto moy papa. | This is my father. | мама |
| sb-04 | Это моя бабушка. | Eto moya babushka. | This is my grandmother. | друг |
| sb-05 | Это мой друг. | Eto moy drug. | This is my friend. | врач |
| sb-06 | Это врач. | Eto vrach. | This is a doctor. | друг |
| sb-07 | Это школа. | Eto shkola. | This is a school. | работа |
| sb-08 | Это книга. | Eto kniga. | This is a book. | билет |
| sb-09 | Это билет. | Eto bilet. | This is a ticket. | поезд |
| sb-10 | Это моя работа. | Eto moya rabota. | This is my job. | школа |
| sb-11 | Это большой город. | Eto bolshoy gorod. | This is a big city. | дом |
| sb-12 | Это тихая улица. | Eto tikhaya ulitsa. | This is a quiet street. | город |
| sb-13 | Это новая машина. | Eto novaya mashina. | This is a new car. | поезд |
| sb-14 | Это мой поезд. | Eto moy poyezd. | This is my train. | машина |
| sb-15 | Вот стол. | Vot stol. | Here is a table. | окно |
| sb-16 | Вот окно. | Vot okno. | Here is a window. | стол |
| sb-17 | Я ем хлеб. | Ya yem khleb. | I eat bread. | яблоко |
| sb-18 | Я пью молоко. | Ya pyu moloko. | I drink milk. | воду |
| sb-19 | Я пью воду. | Ya pyu vodu. | I drink water. | чай |
| sb-20 | Я пью чай. | Ya pyu chay. | I drink tea. | молоко |
| sb-21 | Я ем яблоко. | Ya yem yabloko. | I eat an apple. | хлеб |
| sb-22 | Я вижу рыбу. | Ya vizhu rybu. | I see a fish. | кошку |
| sb-23 | У меня есть кот. | U menya yest kot. | I have a cat. | собака |
| sb-24 | У меня есть собака. | U menya yest sobaka. | I have a dog. | кот |

Data validation must assert `russian === tokens.join(' ') + '.'`, unique IDs, nonempty fields, and a distractor not already present in tokens.

### 5.4 Question modes by pre-answer level

- Levels 0–1: show English and transliteration; shuffled exact tokens only.
- Levels 2–3: show English only; shuffled exact tokens only.
- Levels 4–5: show English only; shuffled exact tokens plus the authored distractor.

The period is rendered as a fixed final punctuation slot and is never draggable/selectable. Token occurrence IDs allow duplicate words if content is expanded later. If the shuffled exact token sequence starts solved, rotate left. At high levels, Check becomes enabled after the correct number of answer tokens is placed; unused distractors may remain in the bank.

### 5.5 Interaction

- Prompt: `Build this sentence in Russian:` plus English.
- Answer area is an ordered row/wrapping list of word tiles followed by a fixed period.
- Bank buttons append; placed buttons return to bank; Undo/Clear/Enter/Backspace follow the shared contract.
- Grading compares exact token order and requires exactly the authored token count.
- Correct feedback shows Russian, transliteration, and English and can play the full Russian sentence.
- Incorrect feedback shows learner sequence and correct sentence; it explains `Russian word order for this prompt is: <russian>` without adding grammar claims.

### 5.6 Tests and completion

Tests must cover all 24 data records, solved-shuffle prevention for two-token prompts, punctuation behavior, distractor handling, scaffold fading, exact ordering, button-only keyboard operation, scheduler/hydration, sentence playback after grading, and weakest-sentence practice.

## 6. Game 4 — Phrase Gap

### 6.1 Learning objective

Retrieve a missing Russian word from sentence meaning and grammatical context. It transitions from recognition choices to typed recall while allowing either Cyrillic or the authored Latin transliteration.

### 6.2 Ownership and exports

- Branch: `game/phrase-gap`
- Worktree: `/Users/t6t/src/russian-alph-phrase-gap`
- Directory owned: `src/games/phrase-gap/**`
- Component: `PhraseGapGame`
- ID: `phrase-gap`
- Home kicker: `Phrases · Context`
- Home description: `Complete Russian phrases by retrieving the missing word.`
- Icon: `…`
- Strategy labels: `Contextual retrieval`, `Typed recall`
- Storage key: `bystro-bukvy-phrase-gap-progress-v1`
- CSS prefix: `phrase-gap__`

### 6.3 Authored content

Create exactly these 24 records. Each stores `id`, `before`, `after`, `answer`, `latinAnswer`, `completedRussian`, `english`, and exactly three Russian `distractors`. The visible blank appears between `before` and `after`; punctuation remains in `after` or after the blank as authored.

| ID | Completed Russian | Answer | Latin answer | English | Distractors |
|---|---|---|---|---|---|
| pg-01 | Это дом. | дом | dom | This is a house. | книга, школа, город |
| pg-02 | Это моя мама. | мама | mama | This is my mother. | папа, бабушка, собака |
| pg-03 | Это мой папа. | папа | papa | This is my father. | мама, друг, врач |
| pg-04 | Моя бабушка пьёт чай. | чай | chay | My grandmother drinks tea. | воду, хлеб, книгу |
| pg-05 | Мой друг читает книгу. | книгу | knigu | My friend reads a book. | билет, воду, улицу |
| pg-06 | Врач работает в городе. | Врач | vrach | The doctor works in the city. | Друг, Папа, Кот |
| pg-07 | Это новая школа. | школа | shkola | This is a new school. | машина, улица, книга |
| pg-08 | Я читаю книгу. | книгу | knigu | I am reading a book. | билет, хлеб, воду |
| pg-09 | Вот мой билет. | билет | bilet | Here is my ticket. | поезд, стол, город |
| pg-10 | Это моя работа. | работа | rabota | This is my job. | школа, машина, улица |
| pg-11 | Москва — большой город. | город | gorod | Moscow is a big city. | дом, поезд, стол |
| pg-12 | Это тихая улица. | улица | ulitsa | This is a quiet street. | школа, машина, работа |
| pg-13 | Вот моя машина. | машина | mashina | Here is my car. | улица, школа, книга |
| pg-14 | Поезд уже здесь. | Поезд | poyezd | The train is already here. | Билет, Город, Врач |
| pg-15 | Книга лежит на столе. | столе | stole | The book is on the table. | окне, поезде, хлебе |
| pg-16 | Окно в доме. | доме | dome | The window is in the house. | городе, школе, поезде |
| pg-17 | Я ем хлеб. | хлеб | khleb | I eat bread. | чай, воду, молоко |
| pg-18 | Я пью молоко. | молоко | moloko | I drink milk. | хлеб, яблоко, билет |
| pg-19 | Я пью воду. | воду | vodu | I drink water. | чай, хлеб, рыбу |
| pg-20 | Мы пьём чай. | чай | chay | We drink tea. | воду, молоко, хлеб |
| pg-21 | Я ем яблоко. | яблоко | yabloko | I eat an apple. | хлеб, рыбу, книгу |
| pg-22 | Кот любит рыбу. | рыбу | rybu | The cat likes fish. | воду, книгу, собаку |
| pg-23 | У меня есть кот. | кот | kot | I have a cat. | собака, друг, врач |
| pg-24 | У меня есть собака. | собака | sobaka | I have a dog. | кот, рыба, машина |

The agent must derive `before` and `after` by authoring them explicitly and validate that inserting `answer` with normalized whitespace reproduces `completedRussian` exactly.

### 6.4 Question modes by pre-answer level

- Levels 0–2: four-choice mode. Show completed sentence with one blank, English translation, and four shuffled Russian choices (answer plus exactly three authored distractors). A–D shortcuts grade immediately.
- Levels 3–5: typed mode. Show the same prompt and English; accept an exact normalized Cyrillic answer or exact normalized `latinAnswer`. Case, surrounding whitespace, Unicode normalization, apostrophe variants, hyphens, and periods are normalized; semantic synonyms are not accepted.

The sentence's completed audio is available only after grading so playback cannot reveal the missing word.

### 6.5 Feedback

- Correct: `<completedRussian> — <english>` plus transliteration of the answer and completed-sentence playback.
- Incorrect choice: mark selected wrong and correct right.
- Incorrect typed: show `The missing word is <answer> (<latinAnswer>).`
- Item progression from choice to typing is level-based only: a question whose pre-answer level is 0–2 remains visibly in choice mode through feedback even if the correct result raises it to level 3.

### 6.6 Tests and completion

Tests must validate all reconstruction pairs and distractors, choice uniqueness, exact transition at level 3, Cyrillic and Latin typed acceptance, near-miss rejection, no pre-answer audio leak, keyboard shortcuts/focus, persistence/hydration, scheduler priority, and weakest-gap practice.

## 7. Game 5 — Mini Dialogues

### 7.1 Learning objective

Choose socially and semantically appropriate Russian replies in common beginner interactions. This trains pragmatic comprehension rather than isolated translation.

### 7.2 Ownership and exports

- Branch: `game/mini-dialogues`
- Worktree: `/Users/t6t/src/russian-alph-mini-dialogues`
- Directory owned: `src/games/mini-dialogues/**`
- Component: `MiniDialoguesGame`
- ID: `mini-dialogues`
- Home kicker: `Conversations · Responses`
- Home description: `Choose natural replies in short everyday Russian dialogues.`
- Icon: `А—Б`
- Strategy labels: `Pragmatic context`, `Interleaved retrieval`
- Storage key: `bystro-bukvy-mini-dialogues-progress-v1`
- CSS prefix: `mini-dialogues__`

### 7.3 Authored content

Create 18 records with the exact core content below. Each record also stores `setting`, `promptLatin`, `replyLatin`, `promptEnglish`, `replyEnglish`, `explanation`, and three authored Russian distractor replies. Explanations must be one factual sentence and may not introduce untested grammar terminology.

| ID | Setting | Prompt | Correct reply | Prompt English | Reply English |
|---|---|---|---|---|---|
| md-01 | Meeting a friend | Привет! | Привет! | Hi! | Hi! |
| md-02 | Entering a shop | Здравствуйте! | Здравствуйте! | Hello! | Hello! |
| md-03 | Checking in | Как дела? | Хорошо, спасибо. | How are things? | Good, thank you. |
| md-04 | Introductions | Как тебя зовут? | Меня зовут Анна. | What is your name? | My name is Anna. |
| md-05 | Introductions | Очень приятно. | Мне тоже. | Nice to meet you. | Likewise. |
| md-06 | Receiving thanks | Спасибо! | Пожалуйста. | Thank you! | You’re welcome. |
| md-07 | A small accident | Извините. | Ничего страшного. | Sorry. | No problem. |
| md-08 | Language ability | Ты говоришь по-английски? | Да, немного. | Do you speak English? | Yes, a little. |
| md-09 | Checking understanding | Вы понимаете? | Нет, не понимаю. | Do you understand? | No, I don’t understand. |
| md-10 | Asking for repetition | Это улица Арбат. | Повторите, пожалуйста. | This is Arbat Street. | Please repeat. |
| md-11 | Asking directions | Где метро? | Метро там. | Where is the metro? | The metro is there. |
| md-12 | Buying transport | Вам нужен билет? | Да, пожалуйста. | Do you need a ticket? | Yes, please. |
| md-13 | Ordering a drink | Что вы будете пить? | Чай, пожалуйста. | What will you drink? | Tea, please. |
| md-14 | Accepting water | Хотите воду? | Да, спасибо. | Would you like water? | Yes, thank you. |
| md-15 | Asking a price | Сколько это стоит? | Сто рублей. | How much does this cost? | One hundred rubles. |
| md-16 | Asking the time | Который час? | Сейчас три часа. | What time is it? | It is three o’clock now. |
| md-17 | Saying goodbye | До свидания! | До свидания! | Goodbye! | Goodbye! |
| md-18 | Until tomorrow | До завтра! | До завтра! | See you tomorrow! | See you tomorrow! |

Use standard transliteration consistent with existing vocabulary (`Privet`, `Zdravstvuyte`, `Kak dela`, etc.). Each distractor must be a reply from a different record and must be clearly inappropriate for the current setting; no option set may contain duplicate visible text. The authored data test must ensure the correct reply is not reused as a distractor for that record and all required fields are populated.

### 7.4 Question modes by pre-answer level

- Levels 0–1: show setting, Russian prompt, prompt transliteration, and prompt English.
- Levels 2–3: show setting, Russian prompt, and prompt English; hide transliteration.
- Levels 4–5: show setting and Russian prompt only; hide both transliteration and English.

All levels show four Russian reply choices. A–D grades immediately. Before grading, a Play prompt button may speak the Russian prompt but never any reply. After grading, Play exchange speaks prompt then correct reply as two queued utterances; if the existing speech hook cannot safely queue two utterances, provide separate Play prompt and Play reply controls instead of changing the shared hook.

### 7.5 Feedback

- Render the completed two-line exchange with speaker labels `А` and `Б`.
- Show both transliterations and English translations after every answer.
- Show the authored one-sentence explanation.
- Wrong choice is marked; correct choice is always marked.
- The next question interleaves settings according to the shared scheduler, never grouping by category.

### 7.6 Tests and completion

Tests must validate 18 complete records and unambiguous options, scaffold hiding at exact levels, A–D shortcuts, Russian-only high-level prompt, prompt audio not leaking a reply, complete feedback/explanation, scheduler/hydration, persistence, and weakest-dialogue practice.

## 8. Game 6 — Reading Sprint

### 8.1 Learning objective

Build fast, accurate Cyrillic decoding by selecting a word's Latin transliteration under either a 45-second sprint or an untimed 20-card relaxed round. Meaning appears only as post-answer reinforcement.

### 8.2 Ownership and exports

- Branch: `game/reading-sprint`
- Worktree: `/Users/t6t/src/russian-alph-reading-sprint`
- Directory owned: `src/games/reading-sprint/**`
- Component: `ReadingSprintGame`
- ID: `reading-sprint`
- Home kicker: `Reading · Fluency`
- Home description: `Decode Cyrillic words quickly while protecting accuracy.`
- Icon: `⚡`
- Strategy labels: `Reading automaticity`, `Accuracy under speed`
- Storage key: `bystro-bukvy-reading-sprint-progress-v1`
- CSS prefix: `reading-sprint__`

### 8.3 Deck construction

Construct the deck at module load from `ALPHABET` examples using this exact deterministic algorithm:

1. Iterate `ALPHABET` in authored order.
2. For each letter, iterate `letter.examples` in authored order.
3. Normalize `example.russian` to lowercase for identity and display.
4. Keep the first occurrence of each normalized Russian word; skip later duplicates.
5. Keep records whose Russian and Latin values are nonempty and whose Russian value contains only Cyrillic letters, `ё`, `ь`, or `ъ` (no spaces or punctuation).
6. Stop after 60 unique records.
7. ID is `read-` plus the normalized Latin value converted to lowercase kebab case; append `-2`, `-3`, etc. only if IDs collide.
8. Store Russian, Latin, and English from the example.

A data test must assert exactly 60 unique Russian values and IDs. No hand-edited duplicate deck is allowed.

### 8.4 Choice generation

Each question shows one Russian word and four unique Latin labels. The correct label is `target.latin`. Distractor ranking is deterministic:

1. Exclude the target and duplicate Latin labels.
2. Score each candidate by absolute Cyrillic-length difference.
3. Add one penalty point when first Cyrillic characters differ and one when last characters differ.
4. Sort ascending by score, then deck order.
5. Take the best six, seeded-shuffle them with injectable random, and choose the first three.
6. Shuffle answer plus distractors.

### 8.5 Pre-round screen and modes

The initial screen contains:

- Explanation: `Choose the Latin transliteration, not the English meaning.`
- Mode radio buttons:
  - **45-second sprint** (default).
  - **Relaxed 20-card round**.
- Best sprint score and best relaxed accuracy if available.
- Start button, autofocus.
- Exit button.

Starting a round resets current score, combo, round attempts, and question history but preserves per-word progress and best results.

### 8.6 Sprint mode mechanics

- Duration is exactly 45,000ms measured from a captured `performance.now()` start time; a 250ms interval only re-renders remaining time, while elapsed time is derived from the clock to avoid drift.
- At zero, stop grading, clear pending next-question timeout, and show results.
- Correct score: `100 + min(currentCombo * 10, 50)` where `currentCombo` is the consecutive-correct count before this answer; then increment combo.
- Incorrect score: 0 and reset combo to 0.
- Show remaining whole seconds using `ceil`.
- After grading, display feedback for 400ms, then automatically advance unless the round has ended.
- A–D choices and keyboard shortcuts remain disabled during the 400ms feedback.
- If the document becomes hidden, pause by recording the hidden timestamp; on visibility return, add hidden duration to the effective start so background time does not consume the round.

### 8.7 Relaxed mode mechanics

- Exactly 20 questions.
- No timer and no speed score.
- The learner presses Continue after feedback instead of auto-advance.
- Results report correct count and accuracy.

### 8.8 Item selection and progress

- First question is the first unseen deck item.
- Subsequent selection: missed/low-accuracy due item first, then unseen authored order, while respecting a two-item recent gap.
- Reading Sprint uses the shared item level and intervals for each graded word.
- Sprint questions may continue with not-currently-due items after no due/unseen item remains because the round duration is authoritative; in that case choose weakest practice items.
- Persist per-word progress, `bestSprintScore`, `bestSprintAccuracy`, and `bestRelaxedAccuracy`.
- Update best fields only at round end.

### 8.9 Question and feedback UI

- Large Russian word with `lang="ru"`.
- Legend: `Choose the transliteration`.
- Four Latin choices with A–D.
- Do not show English before grading.
- Correct feedback: `<russian> · <latin> — <english>`.
- Incorrect feedback marks selected and correct choices and shows the same learning line.
- Results screen offers `Try again`, `Switch mode`, and `All games`.
- `Escape` exits from pre-round and results; during an active round it opens an inline confirmation with `End round` and `Keep reading` so an accidental key cannot erase the run.

### 8.10 Tests

Use fake timers and a stubbed `performance.now`. Tests must cover 60-card deck generation, deterministic distractors, exact scoring/combo cap, 45-second termination without drift, hidden-document pause accounting, 400ms auto-advance, 20-card relaxed completion, English hidden before answer, A–D locking during feedback, best-score persistence, malformed hydration, and Escape confirmation.

## 9. Parallel implementation architecture

### 9.1 Isolation rule

All six agents branch from the same plan commit. Each branch may modify only its assigned `src/games/<slug>/**` directory. Agents must not modify:

- `src/App.tsx`
- `src/App.test.tsx`
- `src/components/games/GameHome.tsx`
- `src/components/layout/ProgressHeader.tsx`
- `src/styles/app.css`
- Existing game/data/hook/learning files
- `README.md`, `index.html`, package files, this plan, or Vercel files

This rule makes all six commits path-disjoint and therefore safely cherry-pickable in any order.

### 9.2 Worktrees, branches, and Herdr tabs

Create six sibling Git worktrees and six tabs in workspace `wF`:

| Tab label | Branch | Worktree | Agent name |
|---|---|---|---|
| Word Builder | game/word-builder | `/Users/t6t/src/russian-alph-word-builder` | `word_builder` |
| Word Dictation | game/word-dictation | `/Users/t6t/src/russian-alph-word-dictation` | `word_dictation` |
| Sentence Builder | game/sentence-builder | `/Users/t6t/src/russian-alph-sentence-builder` | `sentence_builder` |
| Phrase Gap | game/phrase-gap | `/Users/t6t/src/russian-alph-phrase-gap` | `phrase_gap` |
| Mini Dialogues | game/mini-dialogues | `/Users/t6t/src/russian-alph-mini-dialogues` | `mini_dialogues` |
| Reading Sprint | game/reading-sprint | `/Users/t6t/src/russian-alph-reading-sprint` | `reading_sprint` |

Every tab starts Pi with:

```bash
pi --provider openai-codex --model gpt-5.6-sol --thinking medium --name "<game title>"
```

Agents receive the baseline architecture, this file path, exact owned directory, forbidden files, test commands, commit requirement, and a warning not to push or integrate.

### 9.3 Orchestrator monitoring

The orchestrator will:

1. Confirm all six agent statuses become `working`.
2. Periodically read each agent without stealing focus.
3. Respond to blocked agents only after inspecting their question.
4. Require every agent to finish with branch name, commit SHA, changed-file list, storage key, tests, lint, and build results.
5. Inspect `git diff <plan-commit>...<branch>` for scope violations and correctness.
6. Ask the owning agent to repair failures in its own worktree; the orchestrator will not silently rewrite a branch while the agent is active.

### 9.4 Merge sequence

Once all branches pass independently:

1. Stop the main-worktree dev server to avoid stale build output during integration.
2. On `main`, cherry-pick in this order:
   1. Word Builder
   2. Word Dictation
   3. Sentence Builder
   4. Phrase Gap
   5. Mini Dialogues
   6. Reading Sprint
3. Run `npm test`, `npm run lint`, and `npm run build` after all six feature commits are present.
4. Perform the shared integration in one orchestrator commit:
   - Extend `AppSection` with all six IDs.
   - Import and render all six components in `App`.
   - Add six home cards using each exported info object.
   - Preserve all three current games and their progress.
   - Update responsive home layout for nine cards without changing feature CSS.
   - Add app-level tests that open every new game and return home.
   - Update README game list, project structure, and all six localStorage keys.
5. Run the full quality gate again.
6. Start the integrated dev server and smoke-test each of the nine game routes manually from the home screen.
7. Commit integration on `main` with the configured GitHub noreply identity.
8. Push `main` to `origin`.
9. Monitor the Vercel status for the pushed SHA until `success`, inspect deployment logs, and verify the production alias returns HTTP 200.
10. If Vercel fails, fix only on `main`, rerun the complete quality gate, commit, push, and monitor again.

### 9.5 Acceptance criteria for the overall program

The expansion is complete only when:

- The Games home offers nine selectable games, including all six new games.
- Every game can be entered, exited, completed, and practised without a page reload.
- Each game persists independently and malformed storage cannot crash the app.
- Existing Alphabet Trainer, Listen & Pick, and Word Match behavior remains green.
- All automated tests, lint, TypeScript, and Vite production build pass.
- No external credentials, APIs, microphone, backend, or network access are required by the new games.
- The integrated commit is on `origin/main`.
- Vercel production is Ready for that commit and the public production URL responds with HTTP 200.
