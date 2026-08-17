import type { SentenceBuilderSentence } from './content'

export const SENTENCE_BUILDER_PROGRESS_VERSION = 1 as const
export const SENTENCE_BUILDER_MAX_LEVEL = 5
export const SENTENCE_BUILDER_RECENT_GAP = 2
export const SENTENCE_BUILDER_STORAGE_KEY = 'bystro-bukvy-sentence-builder-progress-v1'

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE
export const SENTENCE_BUILDER_INTERVALS = [0, 0, 10 * MINUTE, DAY, 3 * DAY, 10 * DAY] as const

export interface SentenceItemProgress {
  level: number
  attempts: number
  correctAttempts: number
  lapses: number
  lastReviewedAt: number | null
  nextDueAt: number
  lastResult: 'correct' | 'incorrect' | null
}

export interface SentenceBuilderProgress {
  version: 1
  items: Record<string, SentenceItemProgress>
  updatedAt: number
}

export interface SentenceTile {
  id: string
  value: string
  target: boolean
}

export function getSentenceQuestionMode(level: number): { showTransliteration: boolean; includeDistractor: boolean } {
  return { showTransliteration: level <= 1, includeDistractor: level >= 4 }
}

export function createEmptySentenceItemProgress(): SentenceItemProgress {
  return { level: 0, attempts: 0, correctAttempts: 0, lapses: 0, lastReviewedAt: null, nextDueAt: 0, lastResult: null }
}

export function createSentenceBuilderProgress(
  sentences: readonly SentenceBuilderSentence[],
  now: number = Date.now(),
): SentenceBuilderProgress {
  return {
    version: SENTENCE_BUILDER_PROGRESS_VERSION,
    items: Object.fromEntries(sentences.map((sentence) => [sentence.id, createEmptySentenceItemProgress()])),
    updatedAt: now,
  }
}

function isNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isItemProgress(value: unknown): value is SentenceItemProgress {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<SentenceItemProgress>
  return Number.isInteger(item.level) && isNonNegative(item.level) && item.level <= SENTENCE_BUILDER_MAX_LEVEL &&
    Number.isInteger(item.attempts) && isNonNegative(item.attempts) &&
    Number.isInteger(item.correctAttempts) && isNonNegative(item.correctAttempts) && item.correctAttempts <= item.attempts &&
    Number.isInteger(item.lapses) && isNonNegative(item.lapses) &&
    (item.lastReviewedAt === null || isNonNegative(item.lastReviewedAt)) &&
    isNonNegative(item.nextDueAt) &&
    (item.lastResult === null || item.lastResult === 'correct' || item.lastResult === 'incorrect')
}

export function hydrateSentenceBuilderProgress(
  value: unknown,
  sentences: readonly SentenceBuilderSentence[],
  now: number = Date.now(),
): SentenceBuilderProgress {
  const fresh = createSentenceBuilderProgress(sentences, now)
  if (!value || typeof value !== 'object') return fresh
  const candidate = value as Partial<SentenceBuilderProgress>
  if (candidate.version !== SENTENCE_BUILDER_PROGRESS_VERSION || !candidate.items || typeof candidate.items !== 'object') return fresh

  for (const sentence of sentences) {
    const stored = candidate.items[sentence.id]
    if (isItemProgress(stored)) fresh.items[sentence.id] = { ...stored }
  }
  if (isNonNegative(candidate.updatedAt)) fresh.updatedAt = candidate.updatedAt
  return fresh
}

export function recordSentenceAnswer(
  progress: SentenceBuilderProgress,
  id: string,
  correct: boolean,
  now: number = Date.now(),
): SentenceBuilderProgress {
  const previous = progress.items[id]
  if (!previous) return progress
  const level = correct ? Math.min(5, previous.level + 1) : Math.max(0, previous.level - 1)
  return {
    ...progress,
    updatedAt: now,
    items: {
      ...progress.items,
      [id]: {
        ...previous,
        level,
        attempts: previous.attempts + 1,
        correctAttempts: previous.correctAttempts + (correct ? 1 : 0),
        lapses: previous.lapses + (correct ? 0 : 1),
        lastReviewedAt: now,
        nextDueAt: correct ? now + SENTENCE_BUILDER_INTERVALS[level] : now,
        lastResult: correct ? 'correct' : 'incorrect',
      },
    },
  }
}

function dueOrder(first: SentenceBuilderSentence, second: SentenceBuilderSentence, progress: SentenceBuilderProgress): number {
  const a = progress.items[first.id]
  const b = progress.items[second.id]
  const missed = Number(a.lastResult !== 'incorrect') - Number(b.lastResult !== 'incorrect')
  if (missed) return missed
  if (a.level !== b.level) return a.level - b.level
  if (a.nextDueAt !== b.nextDueAt) return a.nextDueAt - b.nextDueAt
  return (a.lastReviewedAt ?? 0) - (b.lastReviewedAt ?? 0)
}

export function selectNextSentenceId(
  sentences: readonly SentenceBuilderSentence[],
  progress: SentenceBuilderProgress,
  now: number = Date.now(),
  recentIds: readonly string[] = [],
): string | null {
  const due = sentences.filter(({ id }) => progress.items[id]?.attempts > 0 && progress.items[id].nextDueAt <= now)
    .sort((a, b) => dueOrder(a, b, progress))
  const unseen = sentences.filter(({ id }) => progress.items[id]?.attempts === 0)
  const candidates = [...due, ...unseen]
  const recent = new Set(recentIds.slice(-SENTENCE_BUILDER_RECENT_GAP))
  return candidates.find(({ id }) => !recent.has(id))?.id ?? candidates[0]?.id ?? null
}

function accuracy(item: SentenceItemProgress): number {
  return item.attempts === 0 ? 0 : item.correctAttempts / item.attempts
}

export function selectWeakestSentenceId(
  sentences: readonly SentenceBuilderSentence[],
  progress: SentenceBuilderProgress,
  recentIds: readonly string[] = [],
): string | null {
  const ordered = [...sentences].sort((a, b) => {
    const first = progress.items[a.id]
    const second = progress.items[b.id]
    if (first.level !== second.level) return first.level - second.level
    const accuracyDifference = accuracy(first) - accuracy(second)
    if (accuracyDifference) return accuracyDifference
    if (first.lapses !== second.lapses) return second.lapses - first.lapses
    return (first.lastReviewedAt ?? 0) - (second.lastReviewedAt ?? 0)
  })
  const recent = new Set(recentIds.slice(-SENTENCE_BUILDER_RECENT_GAP))
  return ordered.find(({ id }) => !recent.has(id))?.id ?? ordered[0]?.id ?? null
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function buildSentenceTiles(
  sentence: SentenceBuilderSentence,
  level: number,
  random: () => number = Math.random,
): SentenceTile[] {
  const targetTiles = sentence.tokens.map((value, index) => ({ id: `${sentence.id}-token-${index}`, value, target: true }))
  const choices = getSentenceQuestionMode(level).includeDistractor
    ? [...targetTiles, { id: `${sentence.id}-distractor`, value: sentence.distractor, target: false }]
    : targetTiles
  const shuffled = shuffle(choices, random)
  const targetPositions = shuffled.map((tile, index) => tile.target ? index : -1).filter((index) => index >= 0)
  const targetValues = targetPositions.map((index) => shuffled[index].value)
  const solved = targetValues.every((value, index) => value === sentence.tokens[index])
  if (solved && targetPositions.length > 1) {
    const rotated = targetPositions.map((_, index) => shuffled[targetPositions[(index + 1) % targetPositions.length]])
    targetPositions.forEach((position, index) => { shuffled[position] = rotated[index] })
  }
  return shuffled
}

export function gradeSentenceTokens(sentence: SentenceBuilderSentence, values: readonly string[]): boolean {
  return values.length === sentence.tokens.length && values.every((value, index) => value === sentence.tokens[index])
}

export function getSentenceBuilderStats(progress: SentenceBuilderProgress): { mastered: number; levelPercent: number } {
  const items = Object.values(progress.items)
  const levelTotal = items.reduce((total, item) => total + item.level, 0)
  return {
    mastered: items.filter((item) => item.level === SENTENCE_BUILDER_MAX_LEVEL).length,
    levelPercent: items.length === 0 ? 0 : Math.round((levelTotal / (items.length * SENTENCE_BUILDER_MAX_LEVEL)) * 100),
  }
}
