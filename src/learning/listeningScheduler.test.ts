import { describe, expect, it } from 'vitest'
import { ALPHABET } from '../data/alphabet'
import {
  createListeningProgress,
  hydrateListeningProgress,
  LISTENING_INTERVALS,
  recordListeningAnswer,
  selectListeningPracticeLetterId,
  selectNextListeningLetterId,
} from './listeningScheduler'

describe('listening scheduler', () => {
  it('introduces every Russian letter before completing a round', () => {
    const now = 1_000_000
    let progress = createListeningProgress(ALPHABET, now)
    let nextId = selectNextListeningLetterId(ALPHABET, progress, now)
    let recentIds: string[] = []
    const seen = new Set<string>()

    while (nextId) {
      expect(seen.has(nextId)).toBe(false)
      seen.add(nextId)
      progress = recordListeningAnswer(progress, nextId, true, now)
      recentIds = [...recentIds, nextId].slice(-6)
      nextId = selectNextListeningLetterId(ALPHABET, progress, now, recentIds)
    }

    expect(seen.size).toBe(33)
    expect([...seen]).toEqual(ALPHABET.map((letter) => letter.id))
  })

  it('returns a missed sound quickly after the recent-question gap', () => {
    const now = 1_000_000
    let progress = createListeningProgress(ALPHABET, now)

    progress = recordListeningAnswer(progress, 'a', false, now)
    expect(selectNextListeningLetterId(ALPHABET, progress, now, ['a'])).toBe('be')

    progress = recordListeningAnswer(progress, 'be', true, now)
    expect(selectNextListeningLetterId(ALPHABET, progress, now, ['a', 'be'])).toBe('ve')

    progress = recordListeningAnswer(progress, 've', true, now)
    expect(selectNextListeningLetterId(ALPHABET, progress, now, ['a', 'be', 've'])).toBe('a')
  })

  it('spaces successful reviews farther apart and makes misses immediately due', () => {
    const now = 1_000_000
    let progress = createListeningProgress(ALPHABET, now)

    progress = recordListeningAnswer(progress, 'a', true, now)
    expect(progress.letters.a.level).toBe(1)
    expect(progress.letters.a.nextDueAt).toBe(now + LISTENING_INTERVALS[1])

    const secondReview = now + LISTENING_INTERVALS[1]
    progress = recordListeningAnswer(progress, 'a', true, secondReview)
    expect(progress.letters.a.level).toBe(2)
    expect(progress.letters.a.nextDueAt).toBe(secondReview + LISTENING_INTERVALS[2])

    progress = recordListeningAnswer(progress, 'a', false, secondReview + 1)
    expect(progress.letters.a.level).toBe(1)
    expect(progress.letters.a.streak).toBe(0)
    expect(progress.letters.a.nextDueAt).toBe(secondReview + 1)
  })

  it('uses a separate versioned schema and repairs invalid letter records', () => {
    const now = 1_000_000
    const stored = createListeningProgress(ALPHABET, now)
    stored.letters.a = {
      ...stored.letters.a,
      attempts: 2,
      correctAttempts: 1,
      level: 1,
    }
    stored.letters.be = {
      ...stored.letters.be,
      attempts: -1,
    }

    const hydrated = hydrateListeningProgress(stored, ALPHABET, now + 10)

    expect(hydrated.version).toBe(1)
    expect(Object.keys(hydrated.letters)).toHaveLength(33)
    expect(hydrated.letters.a.attempts).toBe(2)
    expect(hydrated.letters.be.attempts).toBe(0)
    expect(hydrateListeningProgress({ ...stored, version: 99 }, ALPHABET).letters.a.attempts).toBe(0)
  })

  it('targets the weakest sound during free practice', () => {
    const now = 1_000_000
    let progress = createListeningProgress(ALPHABET, now)
    progress = recordListeningAnswer(progress, 'a', true, now)
    progress = recordListeningAnswer(progress, 'be', false, now + 1)

    expect(selectListeningPracticeLetterId(ALPHABET, progress)).toBe('be')
  })
})
