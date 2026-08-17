import type {
  ReadingCard,
  ReadingItemProgress,
  ReadingSprintMode,
  ReadingSprintProgress,
} from './types'

export const READING_SPRINT_STORAGE_KEY = 'bystro-bukvy-reading-sprint-progress-v1'
export const MAX_LEVEL = 5
export const RECENT_ITEM_GAP = 2

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE
export const LEVEL_INTERVALS = [0, 0, 10 * MINUTE, DAY, 3 * DAY, 10 * DAY] as const

export function createEmptyReadingItemProgress(): ReadingItemProgress {
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

export function createReadingSprintProgress(
  deck: ReadingCard[],
  now: number = Date.now(),
): ReadingSprintProgress {
  return {
    version: 1,
    items: Object.fromEntries(deck.map((card) => [card.id, createEmptyReadingItemProgress()])),
    updatedAt: now,
    bestSprintScore: 0,
    bestSprintAccuracy: 0,
    bestRelaxedAccuracy: 0,
  }
}

function isFiniteInteger(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= minimum && value <= maximum
}

function isReadingItemProgress(value: unknown): value is ReadingItemProgress {
  if (!value || typeof value !== 'object') {
    return false
  }
  const item = value as Partial<ReadingItemProgress>
  return (
    isFiniteInteger(item.level, 0, MAX_LEVEL) &&
    isFiniteInteger(item.attempts, 0) &&
    isFiniteInteger(item.correctAttempts, 0, item.attempts) &&
    isFiniteInteger(item.lapses, 0, item.attempts) &&
    (item.lastReviewedAt === null || (typeof item.lastReviewedAt === 'number' && Number.isFinite(item.lastReviewedAt))) &&
    typeof item.nextDueAt === 'number' && Number.isFinite(item.nextDueAt) &&
    (item.lastResult === null || item.lastResult === 'correct' || item.lastResult === 'incorrect')
  )
}

function validBest(value: unknown): number {
  return isFiniteInteger(value, 0) ? value : 0
}

function validAccuracy(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : 0
}

export function hydrateReadingSprintProgress(
  value: unknown,
  deck: ReadingCard[],
  now: number = Date.now(),
): ReadingSprintProgress {
  const hydrated = createReadingSprintProgress(deck, now)
  if (!value || typeof value !== 'object') {
    return hydrated
  }

  const stored = value as Partial<ReadingSprintProgress>
  if (stored.version !== 1 || !stored.items || typeof stored.items !== 'object') {
    return hydrated
  }

  for (const card of deck) {
    const item = stored.items[card.id]
    if (isReadingItemProgress(item)) {
      hydrated.items[card.id] = { ...item }
    }
  }

  hydrated.updatedAt = typeof stored.updatedAt === 'number' && Number.isFinite(stored.updatedAt)
    ? stored.updatedAt
    : now
  hydrated.bestSprintScore = validBest(stored.bestSprintScore)
  hydrated.bestSprintAccuracy = validAccuracy(stored.bestSprintAccuracy)
  hydrated.bestRelaxedAccuracy = validAccuracy(stored.bestRelaxedAccuracy)
  return hydrated
}

export function readReadingSprintProgress(
  deck: ReadingCard[],
  storage: Storage = window.localStorage,
): ReadingSprintProgress {
  try {
    const value = storage.getItem(READING_SPRINT_STORAGE_KEY)
    return hydrateReadingSprintProgress(value ? JSON.parse(value) : null, deck)
  } catch {
    return createReadingSprintProgress(deck)
  }
}

export function recordReadingAnswer(
  progress: ReadingSprintProgress,
  cardId: string,
  correct: boolean,
  now: number = Date.now(),
): ReadingSprintProgress {
  const previous = progress.items[cardId]
  if (!previous) {
    return progress
  }

  const level = correct
    ? Math.min(MAX_LEVEL, previous.level + 1)
    : Math.max(0, previous.level - 1)
  const nextDueAt = correct ? now + LEVEL_INTERVALS[level] : now

  return {
    ...progress,
    updatedAt: now,
    items: {
      ...progress.items,
      [cardId]: {
        ...previous,
        level,
        attempts: previous.attempts + 1,
        correctAttempts: previous.correctAttempts + (correct ? 1 : 0),
        lapses: previous.lapses + (correct ? 0 : 1),
        lastReviewedAt: now,
        nextDueAt,
        lastResult: correct ? 'correct' : 'incorrect',
      },
    },
  }
}

function accuracy(item: ReadingItemProgress): number {
  return item.attempts === 0 ? 1 : item.correctAttempts / item.attempts
}

function recentSet(recentIds: string[]): Set<string> {
  return new Set(recentIds.slice(-RECENT_ITEM_GAP))
}

export function selectNextReadingCardId(
  deck: ReadingCard[],
  progress: ReadingSprintProgress,
  now: number = Date.now(),
  recentIds: string[] = [],
  allowWeakestPractice = false,
): string | null {
  const recent = recentSet(recentIds)
  const due = deck
    .filter((card) => {
      const item = progress.items[card.id]
      return item.attempts > 0 && item.nextDueAt <= now && !recent.has(card.id)
    })
    .sort((first, second) => {
      const a = progress.items[first.id]
      const b = progress.items[second.id]
      const missed = Number(a.lastResult !== 'incorrect') - Number(b.lastResult !== 'incorrect')
      if (missed !== 0) return missed
      const accuracyDifference = accuracy(a) - accuracy(b)
      if (accuracyDifference !== 0) return accuracyDifference
      if (a.level !== b.level) return a.level - b.level
      return a.nextDueAt - b.nextDueAt
    })

  if (due[0]) {
    return due[0].id
  }

  const unseen = deck.find((card) => progress.items[card.id].attempts === 0 && !recent.has(card.id))
  if (unseen) {
    return unseen.id
  }

  if (!allowWeakestPractice) {
    return null
  }

  const eligible = deck.filter((card) => !recent.has(card.id))
  const candidates = eligible.length > 0 ? eligible : deck
  return [...candidates]
    .sort((first, second) => {
      const a = progress.items[first.id]
      const b = progress.items[second.id]
      if (a.level !== b.level) return a.level - b.level
      const accuracyDifference = accuracy(a) - accuracy(b)
      if (accuracyDifference !== 0) return accuracyDifference
      if (a.lapses !== b.lapses) return b.lapses - a.lapses
      return (a.lastReviewedAt ?? -1) - (b.lastReviewedAt ?? -1)
    })[0]?.id ?? null
}

export function firstUnseenReadingCardId(deck: ReadingCard[], progress: ReadingSprintProgress): string | null {
  return deck.find((card) => progress.items[card.id].attempts === 0)?.id ?? null
}

export function calculateSprintPoints(currentCombo: number): number {
  return 100 + Math.min(currentCombo * 10, 50)
}

export function finishReadingRound(
  progress: ReadingSprintProgress,
  mode: ReadingSprintMode,
  score: number,
  correct: number,
  attempts: number,
  now: number = Date.now(),
): ReadingSprintProgress {
  const roundAccuracy = attempts === 0 ? 0 : Math.round((correct / attempts) * 100)
  return {
    ...progress,
    updatedAt: now,
    bestSprintScore: mode === 'sprint' ? Math.max(progress.bestSprintScore, score) : progress.bestSprintScore,
    bestSprintAccuracy: mode === 'sprint'
      ? Math.max(progress.bestSprintAccuracy, roundAccuracy)
      : progress.bestSprintAccuracy,
    bestRelaxedAccuracy: mode === 'relaxed'
      ? Math.max(progress.bestRelaxedAccuracy, roundAccuracy)
      : progress.bestRelaxedAccuracy,
  }
}

export function getReadingProgressStats(progress: ReadingSprintProgress): {
  mastered: number
  overallPercent: number
} {
  const items = Object.values(progress.items)
  const earned = items.reduce((sum, item) => sum + item.level, 0)
  return {
    mastered: items.filter((item) => item.level === MAX_LEVEL).length,
    overallPercent: items.length === 0 ? 0 : Math.round((earned / (items.length * MAX_LEVEL)) * 100),
  }
}
