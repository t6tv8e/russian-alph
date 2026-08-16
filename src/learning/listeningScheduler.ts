import type { CyrillicLetter } from './types'
import type {
  ListeningLetterProgress,
  ListeningProgress,
} from './listeningTypes'

export const LISTENING_PROGRESS_VERSION = 1 as const
export const LISTENING_MAX_LEVEL = 5
export const LISTENING_RECENT_GAP = 2

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const LISTENING_INTERVALS = [
  0,
  5 * MINUTE,
  HOUR,
  8 * HOUR,
  2 * DAY,
  7 * DAY,
] as const

export function createEmptyListeningLetterProgress(): ListeningLetterProgress {
  return {
    level: 0,
    streak: 0,
    attempts: 0,
    correctAttempts: 0,
    lapses: 0,
    lastReviewedAt: null,
    nextDueAt: 0,
    lastResult: null,
  }
}

export function createListeningProgress(
  alphabet: readonly CyrillicLetter[],
  now: number = Date.now(),
): ListeningProgress {
  return {
    version: LISTENING_PROGRESS_VERSION,
    letters: Object.fromEntries(
      alphabet.map((letter) => [letter.id, createEmptyListeningLetterProgress()]),
    ),
    updatedAt: now,
  }
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isListeningLetterProgress(value: unknown): value is ListeningLetterProgress {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ListeningLetterProgress>
  return (
    Number.isInteger(candidate.level) &&
    isFiniteNonNegative(candidate.level) &&
    candidate.level <= LISTENING_MAX_LEVEL &&
    Number.isInteger(candidate.streak) &&
    isFiniteNonNegative(candidate.streak) &&
    Number.isInteger(candidate.attempts) &&
    isFiniteNonNegative(candidate.attempts) &&
    Number.isInteger(candidate.correctAttempts) &&
    isFiniteNonNegative(candidate.correctAttempts) &&
    candidate.correctAttempts <= candidate.attempts &&
    Number.isInteger(candidate.lapses) &&
    isFiniteNonNegative(candidate.lapses) &&
    (candidate.lastReviewedAt === null || isFiniteNonNegative(candidate.lastReviewedAt)) &&
    isFiniteNonNegative(candidate.nextDueAt) &&
    (candidate.lastResult === 'correct' ||
      candidate.lastResult === 'incorrect' ||
      candidate.lastResult === null)
  )
}

export function hydrateListeningProgress(
  value: unknown,
  alphabet: readonly CyrillicLetter[],
  now: number = Date.now(),
): ListeningProgress {
  const fresh = createListeningProgress(alphabet, now)

  if (!value || typeof value !== 'object') {
    return fresh
  }

  const candidate = value as Partial<ListeningProgress>
  if (
    candidate.version !== LISTENING_PROGRESS_VERSION ||
    !candidate.letters ||
    typeof candidate.letters !== 'object'
  ) {
    return fresh
  }

  for (const letter of alphabet) {
    const storedLetter = candidate.letters[letter.id]
    if (isListeningLetterProgress(storedLetter)) {
      fresh.letters[letter.id] = { ...storedLetter }
    }
  }

  if (isFiniteNonNegative(candidate.updatedAt)) {
    fresh.updatedAt = candidate.updatedAt
  }

  return fresh
}

export function recordListeningAnswer(
  progress: ListeningProgress,
  letterId: string,
  correct: boolean,
  now: number = Date.now(),
): ListeningProgress {
  const previous = progress.letters[letterId]
  if (!previous) {
    return progress
  }

  const level = correct
    ? Math.min(LISTENING_MAX_LEVEL, previous.level + 1)
    : Math.max(0, previous.level - 1)

  return {
    ...progress,
    updatedAt: now,
    letters: {
      ...progress.letters,
      [letterId]: {
        ...previous,
        level,
        streak: correct ? previous.streak + 1 : 0,
        attempts: previous.attempts + 1,
        correctAttempts: previous.correctAttempts + (correct ? 1 : 0),
        lapses: previous.lapses + (correct ? 0 : 1),
        lastReviewedAt: now,
        // Misses are due immediately and return after a short recent-question gap.
        nextDueAt: correct ? now + LISTENING_INTERVALS[level] : now,
        lastResult: correct ? 'correct' : 'incorrect',
      },
    },
  }
}

function compareDueLetters(
  first: CyrillicLetter,
  second: CyrillicLetter,
  progress: ListeningProgress,
): number {
  const firstProgress = progress.letters[first.id]
  const secondProgress = progress.letters[second.id]
  const firstMissed = firstProgress.lastResult === 'incorrect' ? 0 : 1
  const secondMissed = secondProgress.lastResult === 'incorrect' ? 0 : 1

  if (firstMissed !== secondMissed) {
    return firstMissed - secondMissed
  }
  if (firstProgress.level !== secondProgress.level) {
    return firstProgress.level - secondProgress.level
  }
  if (firstProgress.nextDueAt !== secondProgress.nextDueAt) {
    return firstProgress.nextDueAt - secondProgress.nextDueAt
  }

  return (firstProgress.lastReviewedAt ?? 0) - (secondProgress.lastReviewedAt ?? 0)
}

export function selectNextListeningLetterId(
  alphabet: readonly CyrillicLetter[],
  progress: ListeningProgress,
  now: number = Date.now(),
  recentIds: readonly string[] = [],
): string | null {
  const recent = new Set(recentIds.slice(-LISTENING_RECENT_GAP))
  const due = alphabet
    .filter((letter) => {
      const item = progress.letters[letter.id]
      return item && item.attempts > 0 && item.nextDueAt <= now
    })
    .sort((first, second) => compareDueLetters(first, second, progress))
  const dueOutsideRecentGap = due.find((letter) => !recent.has(letter.id))

  if (dueOutsideRecentGap) {
    return dueOutsideRecentGap.id
  }

  const unseen = alphabet.find((letter) => progress.letters[letter.id]?.attempts === 0)
  if (unseen) {
    return unseen.id
  }

  // Do not incorrectly finish a round when its only due item is still recent.
  return due[0]?.id ?? null
}

function listeningAccuracy(progress: ListeningLetterProgress): number {
  return progress.attempts === 0 ? 0 : progress.correctAttempts / progress.attempts
}

export function selectListeningPracticeLetterId(
  alphabet: readonly CyrillicLetter[],
  progress: ListeningProgress,
  recentIds: readonly string[] = [],
): string | null {
  const recent = new Set(recentIds.slice(-LISTENING_RECENT_GAP))
  const attempted = alphabet
    .filter((letter) => progress.letters[letter.id]?.attempts > 0)
    .sort((first, second) => {
      const firstProgress = progress.letters[first.id]
      const secondProgress = progress.letters[second.id]

      if (firstProgress.level !== secondProgress.level) {
        return firstProgress.level - secondProgress.level
      }

      const accuracyDifference =
        listeningAccuracy(firstProgress) - listeningAccuracy(secondProgress)
      if (accuracyDifference !== 0) {
        return accuracyDifference
      }
      if (firstProgress.lapses !== secondProgress.lapses) {
        return secondProgress.lapses - firstProgress.lapses
      }

      return (firstProgress.lastReviewedAt ?? 0) - (secondProgress.lastReviewedAt ?? 0)
    })

  return (
    attempted.find((letter) => !recent.has(letter.id))?.id ??
    attempted[0]?.id ??
    alphabet.find((letter) => progress.letters[letter.id]?.attempts === 0)?.id ??
    alphabet[0]?.id ??
    null
  )
}

export function getListeningStats(progress: ListeningProgress): {
  attempts: number
  correct: number
  accuracy: number
  practised: number
  mastered: number
} {
  const letters = Object.values(progress.letters)
  const attempts = letters.reduce((total, letter) => total + letter.attempts, 0)
  const correct = letters.reduce((total, letter) => total + letter.correctAttempts, 0)

  return {
    attempts,
    correct,
    accuracy: attempts === 0 ? 0 : Math.round((correct / attempts) * 100),
    practised: letters.filter((letter) => letter.attempts > 0).length,
    mastered: letters.filter((letter) => letter.level === LISTENING_MAX_LEVEL).length,
  }
}

export function getListeningDueCount(
  progress: ListeningProgress,
  now: number = Date.now(),
): number {
  return Object.values(progress.letters).filter(
    (letter) => letter.attempts > 0 && letter.nextDueAt <= now,
  ).length
}

export function getNextListeningReviewAt(
  progress: ListeningProgress,
  now: number = Date.now(),
): number | null {
  const futureReviews = Object.values(progress.letters)
    .filter((letter) => letter.attempts > 0 && letter.nextDueAt > now)
    .map((letter) => letter.nextDueAt)

  return futureReviews.length > 0 ? Math.min(...futureReviews) : null
}
