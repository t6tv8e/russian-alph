import { describe, expect, it } from 'vitest'
import { PHRASE_GAPS, reconstructPhrase, validatePhraseGaps } from './content'
import {
  buildPhraseGapChoices,
  getPhraseGapMode,
  isTypedGapCorrect,
  normalizeTypedGap,
} from './logic'
import {
  createPhraseGapProgress,
  hydratePhraseGapProgress,
  PHRASE_GAP_INTERVALS,
  recordPhraseGapAnswer,
  selectNextPhraseGapId,
  selectWeakestPhraseGapId,
} from './progress'

describe('Phrase Gap authored content and grading', () => {
  it('contains exactly 24 valid reconstruction pairs and unique distractors', () => {
    expect(PHRASE_GAPS).toHaveLength(24)
    expect(PHRASE_GAPS.map((item) => item.id)).toEqual(
      Array.from({ length: 24 }, (_, index) => `pg-${String(index + 1).padStart(2, '0')}`),
    )
    expect(validatePhraseGaps(PHRASE_GAPS)).toEqual([])
    for (const item of PHRASE_GAPS) {
      expect(reconstructPhrase(item)).toBe(item.completedRussian)
      expect(item.distractors).toHaveLength(3)
      expect(new Set([item.answer, ...item.distractors]).size).toBe(4)
    }
  })

  it('builds four unique shuffled choices with one answer', () => {
    const choices = buildPhraseGapChoices(PHRASE_GAPS[0], () => 0)
    expect(choices).toHaveLength(4)
    expect(new Set(choices.map((choice) => choice.text)).size).toBe(4)
    expect(choices.filter((choice) => choice.correct)).toHaveLength(1)
    expect(choices.find((choice) => choice.correct)?.text).toBe('дом')
  })

  it('changes from choices to typed recall exactly at level 3', () => {
    expect([0, 1, 2].map(getPhraseGapMode)).toEqual(['choice', 'choice', 'choice'])
    expect([3, 4, 5].map(getPhraseGapMode)).toEqual(['typed', 'typed', 'typed'])
  })

  it('accepts exact normalized Cyrillic or Latin and rejects near misses and synonyms', () => {
    const item = PHRASE_GAPS[0]
    expect(isTypedGapCorrect('  ДОМ. ', item)).toBe(true)
    expect(isTypedGapCorrect(' DOM ', item)).toBe(true)
    expect(isTypedGapCorrect('дома', item)).toBe(false)
    expect(isTypedGapCorrect('d.om', item)).toBe(false)
    expect(isTypedGapCorrect('house', item)).toBe(false)
    expect(normalizeTypedGap('a—b ’ c.')).toBe("a-b ' c")
  })
})

describe('Phrase Gap progress', () => {
  it('advances and lowers levels with the authored intervals and immediate misses', () => {
    const now = 10_000
    let progress = createPhraseGapProgress(PHRASE_GAPS, now)
    progress = recordPhraseGapAnswer(progress, 'pg-01', true, now + 1)
    expect(progress.items['pg-01']).toMatchObject({ level: 1, attempts: 1, correctAttempts: 1, nextDueAt: now + 1 })
    progress.items['pg-01'].level = 2
    progress = recordPhraseGapAnswer(progress, 'pg-01', true, now + 2)
    expect(progress.items['pg-01'].level).toBe(3)
    expect(progress.items['pg-01'].nextDueAt).toBe(now + 2 + PHRASE_GAP_INTERVALS[3])
    progress = recordPhraseGapAnswer(progress, 'pg-01', false, now + 3)
    expect(progress.items['pg-01']).toMatchObject({ level: 2, lapses: 1, nextDueAt: now + 3, lastResult: 'incorrect' })
  })

  it('prioritizes missed due items while respecting the two-item gap', () => {
    const now = 50_000
    const progress = createPhraseGapProgress(PHRASE_GAPS, now)
    for (const id of ['pg-01', 'pg-02', 'pg-03']) {
      progress.items[id] = {
        ...progress.items[id], attempts: 1, correctAttempts: 1, level: 2,
        lastReviewedAt: now - 100, nextDueAt: now - 10, lastResult: 'correct',
      }
    }
    progress.items['pg-02'].lastResult = 'incorrect'
    progress.items['pg-02'].lapses = 1
    expect(selectNextPhraseGapId(PHRASE_GAPS, progress, now)).toBe('pg-02')
    expect(selectNextPhraseGapId(PHRASE_GAPS, progress, now, ['pg-02', 'pg-01'])).toBe('pg-03')
  })

  it('orders ordinary due items by level, due time, then authored order before unseen content', () => {
    const now = 70_000
    const progress = createPhraseGapProgress(PHRASE_GAPS, now)
    progress.items['pg-01'] = {
      ...progress.items['pg-01'], level: 3, attempts: 1, correctAttempts: 1,
      lastReviewedAt: 1, nextDueAt: now - 500, lastResult: 'correct',
    }
    progress.items['pg-02'] = {
      ...progress.items['pg-02'], level: 1, attempts: 1, correctAttempts: 1,
      lastReviewedAt: 2, nextDueAt: now - 10, lastResult: 'correct',
    }
    progress.items['pg-03'] = {
      ...progress.items['pg-03'], level: 1, attempts: 1, correctAttempts: 1,
      lastReviewedAt: 3, nextDueAt: now - 20, lastResult: 'correct',
    }
    expect(selectNextPhraseGapId(PHRASE_GAPS, progress, now)).toBe('pg-03')
    progress.items['pg-02'].nextDueAt = now - 20
    expect(selectNextPhraseGapId(PHRASE_GAPS, progress, now)).toBe('pg-02')
  })

  it('hydrates valid known items, repairs malformed data, adds new items, and ignores unknown ids', () => {
    const stored = createPhraseGapProgress(PHRASE_GAPS.slice(0, 2), 100)
    stored.items['pg-01'] = { ...stored.items['pg-01'], level: 4, attempts: 2, correctAttempts: 2 }
    delete (stored.items['pg-01'] as Partial<typeof stored.items[string]>).lapses
    stored.items['pg-02'] = { ...stored.items['pg-02'], level: 99 }
    stored.items.unknown = { ...stored.items['pg-01'] }
    const hydrated = hydratePhraseGapProgress(stored, PHRASE_GAPS.slice(0, 3), 200)
    expect(hydrated.items['pg-01']).toMatchObject({ level: 4, attempts: 2, lapses: 0 })
    expect(hydrated.items['pg-02']).toEqual(expect.objectContaining({ level: 0, attempts: 0 }))
    expect(hydrated.items['pg-03']).toEqual(expect.objectContaining({ level: 0, attempts: 0 }))
    expect(hydrated.items.unknown).toBeUndefined()
    expect(hydratePhraseGapProgress({ ...stored, version: 2 }, PHRASE_GAPS, 300).items['pg-01'].level).toBe(0)
  })

  it('selects weakest practice by level, accuracy, lapses, then oldest review', () => {
    const progress = createPhraseGapProgress(PHRASE_GAPS, 0)
    for (const item of PHRASE_GAPS) {
      progress.items[item.id] = {
        ...progress.items[item.id], level: 3, attempts: 2, correctAttempts: 2,
        lastReviewedAt: 20, nextDueAt: 100, lastResult: 'correct',
      }
    }
    progress.items['pg-07'] = {
      ...progress.items['pg-07'], level: 1, attempts: 3, correctAttempts: 1, lapses: 2, lastReviewedAt: 10,
    }
    progress.items['pg-08'] = {
      ...progress.items['pg-08'], level: 1, attempts: 3, correctAttempts: 1, lapses: 1, lastReviewedAt: 1,
    }
    expect(selectWeakestPhraseGapId(PHRASE_GAPS, progress)).toBe('pg-07')
  })
})
