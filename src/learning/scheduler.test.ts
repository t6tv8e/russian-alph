import { describe, expect, it } from 'vitest'
import { ALPHABET } from '../data/alphabet'
import {
  createLearningProgress,
  getAnswerMode,
  getOverallProgress,
  recordAnswer,
  selectNextLetterId,
} from './scheduler'

describe('Leitner scheduler', () => {
  it('graduates a letter to typed recall after three choice successes', () => {
    const now = 1_000_000
    let progress = createLearningProgress(ALPHABET, now)

    progress = recordAnswer(progress, 'a', true, 'choice', now)
    progress = recordAnswer(progress, 'a', true, 'choice', now + 1)
    progress = recordAnswer(progress, 'a', true, 'choice', now + 2)

    expect(progress.letters.a.level).toBe(3)
    expect(progress.letters.a.typingUnlocked).toBe(true)
    expect(getAnswerMode(progress.letters.a)).toBe('typing')
  })

  it('returns a missed letter to level one without relocking typing', () => {
    const now = 1_000_000
    let progress = createLearningProgress(ALPHABET, now)

    progress = recordAnswer(progress, 'a', true, 'choice', now)
    progress = recordAnswer(progress, 'a', true, 'choice', now + 1)
    progress = recordAnswer(progress, 'a', true, 'choice', now + 2)
    progress = recordAnswer(progress, 'a', false, 'typing', now + 3)

    expect(progress.letters.a.level).toBe(1)
    expect(progress.letters.a.typingUnlocked).toBe(true)
    expect(progress.letters.a.nextDueAt).toBe(now + 3)
  })

  it('prioritizes a missed due letter after the recent-question gap', () => {
    const now = 1_000_000
    let progress = createLearningProgress(ALPHABET, now)
    progress = recordAnswer(progress, 'a', false, 'choice', now)
    progress = recordAnswer(progress, 'be', true, 'choice', now)
    progress = recordAnswer(progress, 've', true, 'choice', now)

    const nextId = selectNextLetterId(
      ALPHABET,
      progress,
      now,
      ['be', 've'],
      () => 0,
    )

    expect(nextId).toBe('a')
  })

  it('introduces another letter after the active set reaches typed recall', () => {
    const now = 1_000_000
    let progress = createLearningProgress(ALPHABET, now)

    for (const id of ['a', 'be', 've', 'ge', 'de']) {
      progress = recordAnswer(progress, id, true, 'choice', now)
      progress = recordAnswer(progress, id, true, 'choice', now + 1)
      progress = recordAnswer(progress, id, true, 'choice', now + 2)
    }

    expect(selectNextLetterId(ALPHABET, progress, now + 3)).toBe('ye')
  })

  it('derives overall knowledge from all letter levels', () => {
    const now = 1_000_000
    let progress = createLearningProgress(ALPHABET, now)
    progress = recordAnswer(progress, 'a', true, 'choice', now)

    expect(getOverallProgress(progress)).toBe(1)
  })
})
