import type { VocabularyWord } from '../../learning/vocabularyTypes'

export const WORD_BUILDER_STORAGE_KEY = 'bystro-bukvy-word-builder-progress-v1'
export const WORD_BUILDER_INTERVALS = [0, 0, 10 * 60 * 1000, 24 * 60 * 60 * 1000, 3 * 24 * 60 * 60 * 1000, 10 * 24 * 60 * 60 * 1000] as const
const FALLBACK_CHARACTERS = [...'абвгдежзийклмнопрстуфхцчшщыэюя']

export type WordBuilderResult = 'correct' | 'incorrect'

export interface WordBuilderItemProgress {
  level: number
  attempts: number
  correctAttempts: number
  lapses: number
  lastReviewedAt: number | null
  nextDueAt: number
  lastResult: WordBuilderResult | null
}

export interface WordBuilderProgress {
  version: 1
  items: Record<string, WordBuilderItemProgress>
  updatedAt: number
}

export interface WordBuilderTile {
  id: string
  value: string
  kind: 'answer' | 'distractor'
}

export interface WordBuilderMode {
  showTransliteration: boolean
  distractorCount: 0 | 2
}

export function validateWordBuilderContent(words: VocabularyWord[]): string[] {
  const errors: string[] = []
  const ids = new Set(words.map((word) => word.id))
  if (ids.size !== words.length) errors.push('Word IDs must be unique.')

  for (const word of words) {
    if (!word.id || !word.russian || !word.latin || !word.english) {
      errors.push(`${word.id || 'Unknown word'} has an empty required field.`)
    }
    if (word.distractorIds.length !== 3 || word.distractorIds.some((id) => !ids.has(id))) {
      errors.push(`${word.id} must reference three known distractor words.`)
    }
  }
  return errors
}

export function getWordBuilderMode(level: number): WordBuilderMode {
  return {
    showTransliteration: level <= 1,
    distractorCount: level >= 4 ? 2 : 0,
  }
}

export function shuffleTiles<T>(values: T[], random: () => number = Math.random): T[] {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function occurrenceTiles(word: VocabularyWord): WordBuilderTile[] {
  const occurrences = new Map<string, number>()
  return [...word.russian.toLocaleLowerCase('ru-RU')].map((value) => {
    const occurrence = occurrences.get(value) ?? 0
    occurrences.set(value, occurrence + 1)
    return { id: `${word.id}-${value}-${occurrence}`, value, kind: 'answer' as const }
  })
}

export function selectDistractorCharacters(
  target: VocabularyWord,
  words: VocabularyWord[],
  count = 2,
): string[] {
  const byId = new Map(words.map((word) => [word.id, word]))
  const targetCharacters = new Set([...target.russian.toLocaleLowerCase('ru-RU')])
  const selected: string[] = []

  const consider = (value: string) => {
    const character = value.toLocaleLowerCase('ru-RU')
    if (!targetCharacters.has(character) && !selected.includes(character)) selected.push(character)
  }

  for (const distractorId of target.distractorIds) {
    const distractor = byId.get(distractorId)
    if (distractor) [...distractor.russian].forEach(consider)
  }
  for (const character of FALLBACK_CHARACTERS) consider(character)
  return selected.slice(0, count)
}

export function buildWordBuilderTiles(
  target: VocabularyWord,
  words: VocabularyWord[],
  level: number,
  random: () => number = Math.random,
): WordBuilderTile[] {
  const answerTiles = occurrenceTiles(target)
  const distractors = selectDistractorCharacters(
    target,
    words,
    getWordBuilderMode(level).distractorCount,
  ).map((value, index) => ({
    id: `${target.id}-d-${value}-${index}`,
    value,
    kind: 'distractor' as const,
  }))
  let bank = shuffleTiles([...answerTiles, ...distractors], random)
  const targetValue = target.russian.toLocaleLowerCase('ru-RU')
  if (bank.slice(0, answerTiles.length).map((tile) => tile.value).join('') === targetValue && bank.length > 1) {
    bank = [...bank.slice(1), bank[0]]
  }
  return bank
}

export function gradeWordBuilderAnswer(values: string[], target: VocabularyWord): boolean {
  return values.join('').normalize('NFC').toLocaleLowerCase('ru-RU') ===
    target.russian.normalize('NFC').toLocaleLowerCase('ru-RU')
}

export function createWordBuilderItemProgress(): WordBuilderItemProgress {
  return {
    level: 0,
    attempts: 0,
    correctAttempts: 0,
    lapses: 0,
    lastReviewedAt: null,
    nextDueAt: 0,
    lastResult: null,
  }
}

export function createWordBuilderProgress(
  words: VocabularyWord[],
  now = Date.now(),
): WordBuilderProgress {
  return {
    version: 1,
    items: Object.fromEntries(words.map((word) => [word.id, createWordBuilderItemProgress()])),
    updatedAt: now,
  }
}

function isValidItem(value: unknown): value is WordBuilderItemProgress {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return Number.isInteger(item.level) && Number(item.level) >= 0 && Number(item.level) <= 5 &&
    Number.isInteger(item.attempts) && Number(item.attempts) >= 0 &&
    Number.isInteger(item.correctAttempts) && Number(item.correctAttempts) >= 0 &&
    Number(item.correctAttempts) <= Number(item.attempts) &&
    Number.isInteger(item.lapses) && Number(item.lapses) >= 0 &&
    (item.lastReviewedAt === null || (typeof item.lastReviewedAt === 'number' && Number.isFinite(item.lastReviewedAt))) &&
    typeof item.nextDueAt === 'number' && Number.isFinite(item.nextDueAt) &&
    (item.lastResult === null || item.lastResult === 'correct' || item.lastResult === 'incorrect')
}

export function hydrateWordBuilderProgress(
  value: unknown,
  words: VocabularyWord[],
  now = Date.now(),
): WordBuilderProgress {
  if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 1) {
    return createWordBuilderProgress(words, now)
  }
  const stored = value as { items?: unknown; updatedAt?: unknown }
  const storedItems = stored.items && typeof stored.items === 'object'
    ? stored.items as Record<string, unknown>
    : {}
  return {
    version: 1,
    items: Object.fromEntries(words.map((word) => {
      const storedItem = storedItems[word.id]
      return [
        word.id,
        isValidItem(storedItem) ? { ...storedItem } : createWordBuilderItemProgress(),
      ]
    })),
    updatedAt: typeof stored.updatedAt === 'number' && Number.isFinite(stored.updatedAt)
      ? stored.updatedAt
      : now,
  }
}

export function recordWordBuilderAnswer(
  progress: WordBuilderProgress,
  wordId: string,
  correct: boolean,
  now = Date.now(),
): WordBuilderProgress {
  const previous = progress.items[wordId]
  if (!previous) return progress
  const level = correct ? Math.min(5, previous.level + 1) : Math.max(0, previous.level - 1)
  return {
    ...progress,
    updatedAt: now,
    items: {
      ...progress.items,
      [wordId]: {
        ...previous,
        level,
        attempts: previous.attempts + 1,
        correctAttempts: previous.correctAttempts + (correct ? 1 : 0),
        lapses: previous.lapses + (correct ? 0 : 1),
        lastReviewedAt: now,
        nextDueAt: correct ? now + WORD_BUILDER_INTERVALS[level] : now,
        lastResult: correct ? 'correct' : 'incorrect',
      },
    },
  }
}

function withoutRecentWhenPossible(ids: string[], recentIds: string[]): string[] {
  const recent = new Set(recentIds.slice(-2))
  const alternatives = ids.filter((id) => !recent.has(id))
  return alternatives.length > 0 ? alternatives : ids
}

export function selectNextWordBuilderId(
  words: VocabularyWord[],
  progress: WordBuilderProgress,
  now = Date.now(),
  recentIds: string[] = [],
): string | null {
  const order = new Map(words.map((word, index) => [word.id, index]))
  const due = words
    .filter((word) => progress.items[word.id].attempts > 0 && progress.items[word.id].nextDueAt <= now)
    .sort((left, right) => {
      const a = progress.items[left.id]
      const b = progress.items[right.id]
      return Number(b.lastResult === 'incorrect') - Number(a.lastResult === 'incorrect') ||
        a.level - b.level || a.nextDueAt - b.nextDueAt ||
        (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0)
    })
    .map((word) => word.id)
  const unseen = words.filter((word) => progress.items[word.id].attempts === 0).map((word) => word.id)
  const available = withoutRecentWhenPossible([...due, ...unseen], recentIds)
  return available[0] ?? null
}

export function selectWeakestWordBuilderId(
  words: VocabularyWord[],
  progress: WordBuilderProgress,
  recentIds: string[] = [],
): string | null {
  const ranked = words.map((word, index) => ({ word, index })).sort((left, right) => {
    const a = progress.items[left.word.id]
    const b = progress.items[right.word.id]
    const accuracyA = a.attempts === 0 ? 0 : a.correctAttempts / a.attempts
    const accuracyB = b.attempts === 0 ? 0 : b.correctAttempts / b.attempts
    return a.level - b.level || accuracyA - accuracyB || b.lapses - a.lapses ||
      (a.lastReviewedAt ?? -1) - (b.lastReviewedAt ?? -1) || left.index - right.index
  }).map(({ word }) => word.id)
  return withoutRecentWhenPossible(ranked, recentIds)[0] ?? null
}

export function getWordBuilderStats(progress: WordBuilderProgress) {
  const items = Object.values(progress.items)
  return {
    mastered: items.filter((item) => item.level === 5).length,
    overall: Math.round(items.reduce((sum, item) => sum + item.level, 0) / (items.length * 5) * 100) || 0,
    attempts: items.reduce((sum, item) => sum + item.attempts, 0),
    correctAttempts: items.reduce((sum, item) => sum + item.correctAttempts, 0),
  }
}
