import { normalizeAnswer } from './answers'
import type { AnswerMode } from './types'
import type {
  VocabularyChoice,
  VocabularyProgress,
  VocabularyWord,
  VocabularyWordProgress,
} from './vocabularyTypes'

export const VOCABULARY_MAX_LEVEL = 5
export const ACTIVE_WORD_LIMIT = 5
export const RECENT_WORD_GAP = 2

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

export const VOCABULARY_LEVEL_INTERVALS = [
  0,
  0,
  10 * MINUTE,
  DAY,
  3 * DAY,
  10 * DAY,
] as const

export function createEmptyVocabularyWordProgress(): VocabularyWordProgress {
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

export function createVocabularyProgress(
  vocabulary: VocabularyWord[],
  now: number = Date.now(),
): VocabularyProgress {
  return {
    version: 1,
    words: Object.fromEntries(
      vocabulary.map((word) => [word.id, createEmptyVocabularyWordProgress()]),
    ),
    updatedAt: now,
  }
}

function isVocabularyWordProgress(value: unknown): value is VocabularyWordProgress {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<VocabularyWordProgress>
  return (
    typeof candidate.level === 'number' &&
    candidate.level >= 0 &&
    candidate.level <= VOCABULARY_MAX_LEVEL &&
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

export function hydrateVocabularyProgress(
  value: unknown,
  vocabulary: VocabularyWord[],
  now: number = Date.now(),
): VocabularyProgress {
  const empty = createVocabularyProgress(vocabulary, now)

  if (!value || typeof value !== 'object') {
    return empty
  }

  const candidate = value as Partial<VocabularyProgress>
  if (candidate.version !== 1 || !candidate.words || typeof candidate.words !== 'object') {
    return empty
  }

  for (const word of vocabulary) {
    const storedWord = candidate.words[word.id]
    if (isVocabularyWordProgress(storedWord)) {
      empty.words[word.id] = storedWord
    }
  }

  empty.updatedAt = typeof candidate.updatedAt === 'number' ? candidate.updatedAt : now
  return empty
}

export function getVocabularyAnswerMode(progress: VocabularyWordProgress): AnswerMode {
  return progress.typingUnlocked ? 'typing' : 'choice'
}

export function isVocabularyAnswerCorrect(word: VocabularyWord, value: string): boolean {
  const answer = normalizeAnswer(value)
  return Boolean(answer) && word.acceptedAnswers.some(
    (accepted) => normalizeAnswer(accepted) === answer,
  )
}

export function recordVocabularyAnswer(
  progress: VocabularyProgress,
  wordId: string,
  correct: boolean,
  mode: AnswerMode,
  now: number = Date.now(),
): VocabularyProgress {
  const previous = progress.words[wordId]
  if (!previous) {
    return progress
  }

  const choiceCorrectCount =
    correct && mode === 'choice'
      ? previous.choiceCorrectCount + 1
      : previous.choiceCorrectCount
  const typingUnlocked = previous.typingUnlocked || choiceCorrectCount >= 3
  const level = correct ? Math.min(VOCABULARY_MAX_LEVEL, previous.level + 1) : 1
  const nextDueAt = correct ? now + VOCABULARY_LEVEL_INTERVALS[level] : now

  return {
    ...progress,
    updatedAt: now,
    words: {
      ...progress.words,
      [wordId]: {
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

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }

  return result
}

export function buildVocabularyChoices(
  word: VocabularyWord,
  vocabulary: VocabularyWord[],
  random: () => number = Math.random,
): VocabularyChoice[] {
  const byId = new Map(vocabulary.map((item) => [item.id, item]))
  const selected: VocabularyWord[] = [word]
  const usedLabels = new Set([word.english])

  const addCandidate = (candidate: VocabularyWord | undefined) => {
    if (!candidate || candidate.id === word.id || usedLabels.has(candidate.english)) {
      return
    }

    selected.push(candidate)
    usedLabels.add(candidate.english)
  }

  word.distractorIds.forEach((id) => addCandidate(byId.get(id)))

  for (const candidate of shuffled(vocabulary, random)) {
    if (selected.length >= 4) {
      break
    }
    addCandidate(candidate)
  }

  return shuffled(selected.slice(0, 4), random).map((item) => ({
    wordId: item.id,
    label: item.english,
  }))
}

function availableDueWords(
  vocabulary: VocabularyWord[],
  progress: VocabularyProgress,
  now: number,
  recentIds: string[],
): VocabularyWord[] {
  const recent = new Set(recentIds.slice(-RECENT_WORD_GAP))

  return vocabulary.filter((word) => {
    const wordProgress = progress.words[word.id]
    return (
      wordProgress.attempts > 0 &&
      wordProgress.nextDueAt <= now &&
      !recent.has(word.id)
    )
  })
}

function chooseHighestPriority(
  candidates: VocabularyWord[],
  progress: VocabularyProgress,
  random: () => number,
): string | null {
  if (candidates.length === 0) {
    return null
  }

  const sorted = [...candidates].sort((first, second) => {
    const firstProgress = progress.words[first.id]
    const secondProgress = progress.words[second.id]
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

  const best = progress.words[sorted[0].id]
  const peers = sorted.filter((word) => {
    const item = progress.words[word.id]
    return item.lastResult === best.lastResult && item.level === best.level
  })

  return peers[Math.floor(random() * peers.length)]?.id ?? sorted[0].id
}

export function selectNextVocabularyWordId(
  vocabulary: VocabularyWord[],
  progress: VocabularyProgress,
  now: number = Date.now(),
  recentIds: string[] = [],
  random: () => number = Math.random,
): string | null {
  const dueId = chooseHighestPriority(
    availableDueWords(vocabulary, progress, now, recentIds),
    progress,
    random,
  )

  if (dueId) {
    return dueId
  }

  const activeCount = vocabulary.filter((word) => {
    const item = progress.words[word.id]
    return item.attempts > 0 && !item.typingUnlocked
  }).length

  if (activeCount < ACTIVE_WORD_LIMIT) {
    return vocabulary.find((word) => progress.words[word.id].attempts === 0)?.id ?? null
  }

  return null
}

export function selectPracticeVocabularyWordId(
  vocabulary: VocabularyWord[],
  progress: VocabularyProgress,
  recentIds: string[] = [],
): string | null {
  const recent = new Set(recentIds.slice(-RECENT_WORD_GAP))
  const attempted = vocabulary
    .filter((word) => progress.words[word.id].attempts > 0 && !recent.has(word.id))
    .sort((first, second) => {
      const firstProgress = progress.words[first.id]
      const secondProgress = progress.words[second.id]
      if (firstProgress.level !== secondProgress.level) {
        return firstProgress.level - secondProgress.level
      }
      return firstProgress.nextDueAt - secondProgress.nextDueAt
    })

  return (
    attempted[0]?.id ??
    vocabulary.find((word) => progress.words[word.id].attempts === 0)?.id ??
    vocabulary[0]?.id ??
    null
  )
}

export function getVocabularyOverallProgress(progress: VocabularyProgress): number {
  const words = Object.values(progress.words)
  if (words.length === 0) {
    return 0
  }

  const earnedLevels = words.reduce((total, word) => total + word.level, 0)
  return Math.round((earnedLevels / (words.length * VOCABULARY_MAX_LEVEL)) * 100)
}

export function getVocabularyMasteredCount(progress: VocabularyProgress): number {
  return Object.values(progress.words).filter(
    (word) => word.level === VOCABULARY_MAX_LEVEL,
  ).length
}

export function getVocabularyStats(progress: VocabularyProgress): {
  attempts: number
  correct: number
  accuracy: number
} {
  const words = Object.values(progress.words)
  const attempts = words.reduce((total, word) => total + word.attempts, 0)
  const correct = words.reduce((total, word) => total + word.correctAttempts, 0)

  return {
    attempts,
    correct,
    accuracy: attempts === 0 ? 0 : Math.round((correct / attempts) * 100),
  }
}

export function getNextVocabularyReviewAt(
  progress: VocabularyProgress,
  now: number = Date.now(),
): number | null {
  const futureReviews = Object.values(progress.words)
    .filter((word) => word.attempts > 0 && word.nextDueAt > now)
    .map((word) => word.nextDueAt)

  return futureReviews.length > 0 ? Math.min(...futureReviews) : null
}
