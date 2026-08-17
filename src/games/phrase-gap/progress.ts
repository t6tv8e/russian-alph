import type { PhraseGapItem } from './content'

export const PHRASE_GAP_MAX_LEVEL = 5
export const PHRASE_GAP_INTERVALS = [0, 0, 10 * 60_000, 24 * 60 * 60_000, 3 * 24 * 60 * 60_000, 10 * 24 * 60 * 60_000] as const
export const PHRASE_GAP_RECENT_GAP = 2

export type PhraseGapResult = 'correct' | 'incorrect'

export interface PhraseGapItemProgress {
  level: number
  attempts: number
  correctAttempts: number
  lapses: number
  lastReviewedAt: number | null
  nextDueAt: number
  lastResult: PhraseGapResult | null
}

export interface PhraseGapProgress {
  version: 1
  items: Record<string, PhraseGapItemProgress>
  updatedAt: number
}

export function createEmptyPhraseGapItem(): PhraseGapItemProgress {
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

export function createPhraseGapProgress(
  items: readonly PhraseGapItem[],
  now: number = Date.now(),
): PhraseGapProgress {
  return {
    version: 1,
    items: Object.fromEntries(items.map((item) => [item.id, createEmptyPhraseGapItem()])),
    updatedAt: now,
  }
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isPhraseGapItemProgress(value: unknown): value is PhraseGapItemProgress {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<PhraseGapItemProgress>
  return (
    Number.isInteger(item.level) &&
    isNonNegativeFinite(item.level) &&
    item.level! <= PHRASE_GAP_MAX_LEVEL &&
    Number.isInteger(item.attempts) &&
    isNonNegativeFinite(item.attempts) &&
    Number.isInteger(item.correctAttempts) &&
    isNonNegativeFinite(item.correctAttempts) &&
    item.correctAttempts! <= item.attempts! &&
    (item.lapses === undefined || (Number.isInteger(item.lapses) && isNonNegativeFinite(item.lapses))) &&
    (item.lastReviewedAt === null || isNonNegativeFinite(item.lastReviewedAt)) &&
    isNonNegativeFinite(item.nextDueAt) &&
    (item.lastResult === null || item.lastResult === 'correct' || item.lastResult === 'incorrect')
  )
}

export function hydratePhraseGapProgress(
  value: unknown,
  items: readonly PhraseGapItem[],
  now: number = Date.now(),
): PhraseGapProgress {
  if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 1) {
    return createPhraseGapProgress(items, now)
  }
  const candidate = value as { items?: unknown; updatedAt?: unknown }
  const storedItems = candidate.items && typeof candidate.items === 'object'
    ? candidate.items as Record<string, unknown>
    : {}
  return {
    version: 1,
    items: Object.fromEntries(items.map((item) => {
      const stored = storedItems[item.id]
      return [
        item.id,
        isPhraseGapItemProgress(stored)
          ? { ...stored, lapses: stored.lapses ?? 0 }
          : createEmptyPhraseGapItem(),
      ]
    })),
    updatedAt: isNonNegativeFinite(candidate.updatedAt) ? candidate.updatedAt : now,
  }
}

export function recordPhraseGapAnswer(
  progress: PhraseGapProgress,
  itemId: string,
  correct: boolean,
  now: number = Date.now(),
): PhraseGapProgress {
  const previous = progress.items[itemId]
  if (!previous) throw new Error(`Unknown Phrase Gap item: ${itemId}`)
  const level = Math.max(0, Math.min(PHRASE_GAP_MAX_LEVEL, previous.level + (correct ? 1 : -1)))
  return {
    ...progress,
    updatedAt: now,
    items: {
      ...progress.items,
      [itemId]: {
        ...previous,
        level,
        attempts: previous.attempts + 1,
        correctAttempts: previous.correctAttempts + (correct ? 1 : 0),
        lapses: previous.lapses + (correct ? 0 : 1),
        lastReviewedAt: now,
        nextDueAt: correct ? now + PHRASE_GAP_INTERVALS[level] : now,
        lastResult: correct ? 'correct' : 'incorrect',
      },
    },
  }
}

function duePriority(
  first: PhraseGapItem,
  second: PhraseGapItem,
  progress: PhraseGapProgress,
  order: ReadonlyMap<string, number>,
): number {
  const a = progress.items[first.id]
  const b = progress.items[second.id]
  const missed = Number(b.lastResult === 'incorrect') - Number(a.lastResult === 'incorrect')
  if (missed !== 0) return missed
  if (a.level !== b.level) return a.level - b.level
  if (a.nextDueAt !== b.nextDueAt) return a.nextDueAt - b.nextDueAt
  return (order.get(first.id) ?? 0) - (order.get(second.id) ?? 0)
}

export function selectNextPhraseGapId(
  items: readonly PhraseGapItem[],
  progress: PhraseGapProgress,
  now: number = Date.now(),
  recentIds: readonly string[] = [],
): string | null {
  const recent = new Set(recentIds.slice(-PHRASE_GAP_RECENT_GAP))
  const order = new Map(items.map((item, index) => [item.id, index]))
  const due = items
    .filter((item) => {
      const state = progress.items[item.id]
      return state.attempts > 0 && state.nextDueAt <= now
    })
    .sort((a, b) => duePriority(a, b, progress, order))
  const dueOutsideGap = due.find((item) => !recent.has(item.id))
  if (dueOutsideGap) return dueOutsideGap.id

  const unseen = items.find((item) => progress.items[item.id].attempts === 0)
  if (unseen) return unseen.id

  return due[0]?.id ?? null
}

function accuracy(item: PhraseGapItemProgress): number {
  return item.attempts === 0 ? 0 : item.correctAttempts / item.attempts
}

export function selectWeakestPhraseGapId(
  items: readonly PhraseGapItem[],
  progress: PhraseGapProgress,
  recentIds: readonly string[] = [],
): string | null {
  const recent = new Set(recentIds.slice(-PHRASE_GAP_RECENT_GAP))
  const sorted = [...items].sort((first, second) => {
    const a = progress.items[first.id]
    const b = progress.items[second.id]
    if (a.level !== b.level) return a.level - b.level
    if (accuracy(a) !== accuracy(b)) return accuracy(a) - accuracy(b)
    if (a.lapses !== b.lapses) return b.lapses - a.lapses
    return (a.lastReviewedAt ?? 0) - (b.lastReviewedAt ?? 0)
  })
  return sorted.find((item) => !recent.has(item.id))?.id ?? sorted[0]?.id ?? null
}

export function getPhraseGapStats(progress: PhraseGapProgress): {
  mastered: number
  attempted: number
  levelPercent: number
  accuracy: number
} {
  const values = Object.values(progress.items)
  const attempts = values.reduce((total, item) => total + item.attempts, 0)
  const correct = values.reduce((total, item) => total + item.correctAttempts, 0)
  const levels = values.reduce((total, item) => total + item.level, 0)
  return {
    mastered: values.filter((item) => item.level === PHRASE_GAP_MAX_LEVEL).length,
    attempted: values.filter((item) => item.attempts > 0).length,
    levelPercent: values.length === 0 ? 0 : Math.round((levels / (values.length * PHRASE_GAP_MAX_LEVEL)) * 100),
    accuracy: attempts === 0 ? 0 : Math.round((correct / attempts) * 100),
  }
}
