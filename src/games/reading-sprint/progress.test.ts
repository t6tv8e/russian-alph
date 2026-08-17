import { describe, expect, it } from 'vitest'
import { READING_DECK } from './deck'
import {
  calculateSprintPoints,
  createReadingSprintProgress,
  finishReadingRound,
  hydrateReadingSprintProgress,
  LEVEL_INTERVALS,
  recordReadingAnswer,
  selectNextReadingCardId,
} from './progress'

describe('Reading Sprint progress', () => {
  it('uses the shared level schedule and makes misses immediately due', () => {
    const card = READING_DECK[0]
    let progress = createReadingSprintProgress(READING_DECK, 0)

    progress = recordReadingAnswer(progress, card.id, true, 1_000)
    expect(progress.items[card.id]).toMatchObject({
      level: 1,
      attempts: 1,
      correctAttempts: 1,
      nextDueAt: 1_000 + LEVEL_INTERVALS[1],
      lastResult: 'correct',
    })

    progress = recordReadingAnswer(progress, card.id, false, 2_000)
    expect(progress.items[card.id]).toMatchObject({
      level: 0,
      attempts: 2,
      correctAttempts: 1,
      lapses: 1,
      nextDueAt: 2_000,
      lastResult: 'incorrect',
    })
  })

  it('prioritizes missed due cards, respects the two-card gap, then uses unseen order', () => {
    const progress = createReadingSprintProgress(READING_DECK, 0)
    const first = READING_DECK[0]
    const second = READING_DECK[1]
    progress.items[first.id] = {
      ...progress.items[first.id],
      attempts: 2,
      correctAttempts: 1,
      lapses: 1,
      lastResult: 'incorrect',
      lastReviewedAt: 10,
      nextDueAt: 10,
    }
    progress.items[second.id] = {
      ...progress.items[second.id],
      attempts: 1,
      correctAttempts: 1,
      lastResult: 'correct',
      lastReviewedAt: 5,
      nextDueAt: 5,
    }

    expect(selectNextReadingCardId(READING_DECK, progress, 20)).toBe(first.id)
    expect(selectNextReadingCardId(READING_DECK, progress, 20, [first.id, second.id])).toBe(READING_DECK[2].id)
  })

  it('repairs malformed known items, adds new cards, and ignores unknown IDs', () => {
    const first = READING_DECK[0]
    const second = READING_DECK[1]
    const valid = {
      level: 3,
      attempts: 4,
      correctAttempts: 3,
      lapses: 1,
      lastReviewedAt: 100,
      nextDueAt: 200,
      lastResult: 'correct' as const,
    }
    const hydrated = hydrateReadingSprintProgress({
      version: 1,
      items: {
        [first.id]: valid,
        [second.id]: { ...valid, level: 99 },
        removed: valid,
      },
      updatedAt: 123,
      bestSprintScore: 450,
      bestSprintAccuracy: 80,
      bestRelaxedAccuracy: 'bad',
    }, READING_DECK, 999)

    expect(hydrated.items[first.id]).toEqual(valid)
    expect(hydrated.items[second.id]).toMatchObject({ level: 0, attempts: 0 })
    expect(hydrated.items).not.toHaveProperty('removed')
    expect(Object.keys(hydrated.items)).toHaveLength(60)
    expect(hydrated).toMatchObject({
      updatedAt: 123,
      bestSprintScore: 450,
      bestSprintAccuracy: 80,
      bestRelaxedAccuracy: 0,
    })
    expect(hydrateReadingSprintProgress({ version: 2, items: {} }, READING_DECK, 999).bestSprintScore).toBe(0)
  })

  it('calculates combo points exactly, caps the bonus, and updates bests only at round end', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 20].map(calculateSprintPoints)).toEqual([
      100, 110, 120, 130, 140, 150, 150, 150,
    ])

    const progress = createReadingSprintProgress(READING_DECK, 0)
    const sprint = finishReadingRound(progress, 'sprint', 730, 5, 6, 100)
    expect(sprint).toMatchObject({
      bestSprintScore: 730,
      bestSprintAccuracy: 83,
      bestRelaxedAccuracy: 0,
    })
    const relaxed = finishReadingRound(sprint, 'relaxed', 0, 19, 20, 200)
    expect(relaxed).toMatchObject({
      bestSprintScore: 730,
      bestSprintAccuracy: 83,
      bestRelaxedAccuracy: 95,
    })
  })
})
