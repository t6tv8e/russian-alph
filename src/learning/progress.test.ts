import { describe, expect, it } from 'vitest'
import { ALPHABET } from '../data/alphabet'
import { createEmptyLetterProgress, createLearningProgress, MAX_LEVEL } from './scheduler'
import { getDueReviewCount, getLetterAccuracy, getLetterStatus } from './progress'

describe('progress presentation helpers', () => {
  it('maps learning stages to readable labels', () => {
    const progress = createEmptyLetterProgress()
    expect(getLetterStatus(progress)).toBe('Not started')

    progress.level = 2
    expect(getLetterStatus(progress)).toBe('Learning')

    progress.typingUnlocked = true
    expect(getLetterStatus(progress)).toBe('Typed recall')

    progress.level = MAX_LEVEL
    expect(getLetterStatus(progress)).toBe('Mastered')
  })

  it('calculates per-letter accuracy and due reviews', () => {
    const progress = createLearningProgress(ALPHABET, 100)
    expect(getLetterAccuracy(progress.letters.a)).toBeNull()

    progress.letters.a.attempts = 4
    progress.letters.a.correctAttempts = 3
    progress.letters.a.nextDueAt = 100

    expect(getLetterAccuracy(progress.letters.a)).toBe(75)
    expect(getDueReviewCount(progress, 100)).toBe(1)
  })
})
