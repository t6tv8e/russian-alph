import { MAX_LEVEL } from './scheduler'
import type { LearningProgress, LetterProgress } from './types'

export function getLetterStatus(progress: LetterProgress): string {
  if (progress.level === 0) {
    return 'Not started'
  }
  if (progress.level === MAX_LEVEL) {
    return 'Mastered'
  }
  if (progress.typingUnlocked) {
    return 'Typed recall'
  }
  return 'Learning'
}

export function getLetterAccuracy(progress: LetterProgress): number | null {
  if (progress.attempts === 0) {
    return null
  }

  return Math.round((progress.correctAttempts / progress.attempts) * 100)
}

export function getDueReviewCount(
  progress: LearningProgress,
  now: number = Date.now(),
): number {
  return Object.values(progress.letters).filter(
    (letter) => letter.attempts > 0 && letter.nextDueAt <= now,
  ).length
}
