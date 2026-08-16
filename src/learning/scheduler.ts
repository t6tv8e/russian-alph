import type {
  AnswerMode,
  CyrillicLetter,
  LearningProgress,
  LetterProgress,
} from './types'

export const MAX_LEVEL = 5
export const ACTIVE_LETTER_LIMIT = 5
export const RECENT_QUESTION_GAP = 2

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

export const LEVEL_INTERVALS = [0, 0, 10 * MINUTE, DAY, 3 * DAY, 10 * DAY] as const

export function createEmptyLetterProgress(): LetterProgress {
  return {
    level: 0,
    choiceCorrectCount: 0,
    typingUnlocked: false,
    attempts: 0,
    correctAttempts: 0,
    lastReviewedAt: null,
    nextDueAt: 0,
    lastResult: null,
  }
}

export function createLearningProgress(
  alphabet: CyrillicLetter[],
  now: number = Date.now(),
): LearningProgress {
  return {
    version: 1,
    letters: Object.fromEntries(
      alphabet.map((letter) => [letter.id, createEmptyLetterProgress()]),
    ),
    updatedAt: now,
  }
}

function isLetterProgress(value: unknown): value is LetterProgress {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<LetterProgress>
  return (
    typeof candidate.level === 'number' &&
    candidate.level >= 0 &&
    candidate.level <= MAX_LEVEL &&
    typeof candidate.choiceCorrectCount === 'number' &&
    typeof candidate.typingUnlocked === 'boolean' &&
    typeof candidate.attempts === 'number' &&
    typeof candidate.correctAttempts === 'number' &&
    (typeof candidate.lastReviewedAt === 'number' || candidate.lastReviewedAt === null) &&
    typeof candidate.nextDueAt === 'number' &&
    (candidate.lastResult === 'correct' ||
      candidate.lastResult === 'incorrect' ||
      candidate.lastResult === null)
  )
}

export function hydrateLearningProgress(
  value: unknown,
  alphabet: CyrillicLetter[],
  now: number = Date.now(),
): LearningProgress {
  const empty = createLearningProgress(alphabet, now)

  if (!value || typeof value !== 'object') {
    return empty
  }

  const candidate = value as Partial<LearningProgress>
  if (candidate.version !== 1 || !candidate.letters || typeof candidate.letters !== 'object') {
    return empty
  }

  for (const letter of alphabet) {
    const storedLetter = candidate.letters[letter.id]
    if (isLetterProgress(storedLetter)) {
      empty.letters[letter.id] = storedLetter
    }
  }

  empty.updatedAt = typeof candidate.updatedAt === 'number' ? candidate.updatedAt : now
  return empty
}

export function getAnswerMode(progress: LetterProgress): AnswerMode {
  return progress.typingUnlocked ? 'typing' : 'choice'
}

export function recordAnswer(
  progress: LearningProgress,
  letterId: string,
  correct: boolean,
  mode: AnswerMode,
  now: number = Date.now(),
): LearningProgress {
  const previous = progress.letters[letterId]
  if (!previous) {
    return progress
  }

  const choiceCorrectCount =
    correct && mode === 'choice'
      ? previous.choiceCorrectCount + 1
      : previous.choiceCorrectCount
  const typingUnlocked = previous.typingUnlocked || choiceCorrectCount >= 3
  const level = correct ? Math.min(MAX_LEVEL, previous.level + 1) : 1
  const nextDueAt = correct ? now + LEVEL_INTERVALS[level] : now

  return {
    ...progress,
    updatedAt: now,
    letters: {
      ...progress.letters,
      [letterId]: {
        ...previous,
        level,
        choiceCorrectCount,
        typingUnlocked,
        attempts: previous.attempts + 1,
        correctAttempts: previous.correctAttempts + (correct ? 1 : 0),
        lastReviewedAt: now,
        nextDueAt,
        lastResult: correct ? 'correct' : 'incorrect',
      },
    },
  }
}

function availableDueLetters(
  alphabet: CyrillicLetter[],
  progress: LearningProgress,
  now: number,
  recentIds: string[],
): CyrillicLetter[] {
  const recent = new Set(recentIds.slice(-RECENT_QUESTION_GAP))

  return alphabet.filter((letter) => {
    const letterProgress = progress.letters[letter.id]
    return (
      letterProgress.attempts > 0 &&
      letterProgress.nextDueAt <= now &&
      !recent.has(letter.id)
    )
  })
}

function chooseHighestPriority(
  candidates: CyrillicLetter[],
  progress: LearningProgress,
  random: () => number,
): string | null {
  if (candidates.length === 0) {
    return null
  }

  const sorted = [...candidates].sort((first, second) => {
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
    return firstProgress.nextDueAt - secondProgress.nextDueAt
  })

  const best = progress.letters[sorted[0].id]
  const peers = sorted.filter((letter) => {
    const item = progress.letters[letter.id]
    return item.lastResult === best.lastResult && item.level === best.level
  })

  return peers[Math.floor(random() * peers.length)]?.id ?? sorted[0].id
}

export function selectNextLetterId(
  alphabet: CyrillicLetter[],
  progress: LearningProgress,
  now: number = Date.now(),
  recentIds: string[] = [],
  random: () => number = Math.random,
): string | null {
  const dueId = chooseHighestPriority(
    availableDueLetters(alphabet, progress, now, recentIds),
    progress,
    random,
  )

  if (dueId) {
    return dueId
  }

  const activeCount = alphabet.filter((letter) => {
    const item = progress.letters[letter.id]
    return item.attempts > 0 && !item.typingUnlocked
  }).length

  if (activeCount < ACTIVE_LETTER_LIMIT) {
    const unseen = alphabet.find((letter) => progress.letters[letter.id].attempts === 0)
    if (unseen) {
      return unseen.id
    }
  }

  return null
}

export function selectPracticeLetterId(
  alphabet: CyrillicLetter[],
  progress: LearningProgress,
  recentIds: string[] = [],
): string | null {
  const recent = new Set(recentIds.slice(-RECENT_QUESTION_GAP))
  const attempted = alphabet
    .filter((letter) => progress.letters[letter.id].attempts > 0 && !recent.has(letter.id))
    .sort((first, second) => {
      const firstProgress = progress.letters[first.id]
      const secondProgress = progress.letters[second.id]
      if (firstProgress.level !== secondProgress.level) {
        return firstProgress.level - secondProgress.level
      }
      return firstProgress.nextDueAt - secondProgress.nextDueAt
    })

  return (
    attempted[0]?.id ??
    alphabet.find((letter) => progress.letters[letter.id].attempts === 0)?.id ??
    alphabet[0]?.id ??
    null
  )
}

export function getOverallProgress(progress: LearningProgress): number {
  const letters = Object.values(progress.letters)
  if (letters.length === 0) {
    return 0
  }

  const earnedLevels = letters.reduce((total, letter) => total + letter.level, 0)
  return Math.round((earnedLevels / (letters.length * MAX_LEVEL)) * 100)
}

export function getMasteredCount(progress: LearningProgress): number {
  return Object.values(progress.letters).filter((letter) => letter.level === MAX_LEVEL)
    .length
}

export function getSessionStats(progress: LearningProgress): {
  attempts: number
  correct: number
  accuracy: number
} {
  const letters = Object.values(progress.letters)
  const attempts = letters.reduce((total, letter) => total + letter.attempts, 0)
  const correct = letters.reduce((total, letter) => total + letter.correctAttempts, 0)

  return {
    attempts,
    correct,
    accuracy: attempts === 0 ? 0 : Math.round((correct / attempts) * 100),
  }
}

export function getNextReviewAt(progress: LearningProgress, now: number = Date.now()): number | null {
  const futureReviews = Object.values(progress.letters)
    .filter((letter) => letter.attempts > 0 && letter.nextDueAt > now)
    .map((letter) => letter.nextDueAt)

  return futureReviews.length > 0 ? Math.min(...futureReviews) : null
}
