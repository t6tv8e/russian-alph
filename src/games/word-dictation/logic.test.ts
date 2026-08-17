import { describe, expect, it } from 'vitest'
import { VOCABULARY } from '../../data/vocabulary'
import {
  buildWordDictationTiles,
  createWordDictationProgress,
  getDistractorCount,
  gradeWordDictation,
  hydrateWordDictationProgress,
  recordWordDictationAnswer,
  selectNextWordDictationId,
  selectWeakestWordDictationId,
  showsTransliteration,
  validateWordDictationContent,
  WORD_DICTATION_INTERVALS,
} from './logic'

describe('Word Dictation content and tiles', () => {
  it('uses all valid authored vocabulary and exact level scaffolds', () => {
    expect(validateWordDictationContent(VOCABULARY)).toEqual([])
    expect(VOCABULARY).toHaveLength(24)
    expect([0, 1, 2, 3, 4, 5].map(showsTransliteration)).toEqual([
      true, true, false, false, false, false,
    ])
    expect([0, 1, 2, 3, 4, 5].map(getDistractorCount)).toEqual([1, 1, 2, 2, 3, 3])
  })

  it('gives repeated letters stable independent occurrence ids and exact distractor counts', () => {
    const mama = VOCABULARY[0]
    for (let level = 0; level <= 5; level += 1) {
      const tiles = buildWordDictationTiles(mama, VOCABULARY, level, () => 0.75)
      expect(tiles.filter((tile) => tile.distractor)).toHaveLength(getDistractorCount(level))
      expect(new Set(tiles.map((tile) => tile.id)).size).toBe(tiles.length)
    }
    const tiles = buildWordDictationTiles(mama, VOCABULARY, 0, () => 0)
    expect(tiles.map((tile) => tile.id)).toEqual(expect.arrayContaining([
      'mama-м-0', 'mama-м-1', 'mama-а-0', 'mama-а-1',
    ]))
    expect(gradeWordDictation(tiles, [
      'mama-м-0', 'mama-а-0', 'mama-м-1', 'mama-а-1',
    ], 'мама')).toBe(true)
  })

  it('rotates a shuffle whose answer letters remain accidentally solved', () => {
    const dom = VOCABULARY.find((word) => word.id === 'dom')!
    const tiles = buildWordDictationTiles(dom, VOCABULARY, 0, () => 0.999)
    expect(tiles.slice(0, dom.russian.length).map((tile) => tile.value).join('')).not.toBe('дом')
  })
})

describe('Word Dictation progress', () => {
  it('grades exact ordered Cyrillic and applies shared level intervals', () => {
    const now = 1_000
    let progress = createWordDictationProgress(VOCABULARY, now)
    progress = recordWordDictationAnswer(progress, 'mama', true, now)
    expect(progress.items.mama).toMatchObject({
      level: 1,
      attempts: 1,
      correctAttempts: 1,
      nextDueAt: now + WORD_DICTATION_INTERVALS[1],
      lastResult: 'correct',
    })
    progress = recordWordDictationAnswer(progress, 'mama', false, now + 1)
    expect(progress.items.mama).toMatchObject({
      level: 0,
      attempts: 2,
      correctAttempts: 1,
      nextDueAt: now + 1,
      lastResult: 'incorrect',
    })
  })

  it('retries a miss only after the required two-item gap', () => {
    const now = 5_000
    let progress = createWordDictationProgress(VOCABULARY, now)
    progress = recordWordDictationAnswer(progress, 'mama', false, now)
    expect(selectNextWordDictationId(VOCABULARY, progress, now, ['mama'])).toBe('papa')
    expect(selectNextWordDictationId(VOCABULARY, progress, now, ['mama', 'papa'])).toBe('babushka')
    expect(selectNextWordDictationId(VOCABULARY, progress, now, ['papa', 'babushka'])).toBe('mama')
  })

  it('prioritises missed, low-level, oldest due words and weakest practice', () => {
    const now = 9_000
    const progress = createWordDictationProgress(VOCABULARY, now)
    for (const id of ['mama', 'papa', 'babushka']) {
      progress.items[id] = {
        level: id === 'papa' ? 2 : 1,
        attempts: 2,
        correctAttempts: id === 'mama' ? 1 : 2,
        lastReviewedAt: id === 'babushka' ? 100 : 200,
        nextDueAt: id === 'babushka' ? 100 : 200,
        lastResult: id === 'mama' ? 'incorrect' : 'correct',
      }
    }
    expect(selectNextWordDictationId(VOCABULARY, progress, now)).toBe('mama')
    progress.items.mama.nextDueAt = now + 1
    expect(selectNextWordDictationId(VOCABULARY, progress, now)).toBe('babushka')
    expect(selectWeakestWordDictationId(VOCABULARY, progress)).toBe('drug')
  })

  it('repairs malformed known items, adds new content, and ignores unknown ids', () => {
    const now = 42
    const valid = createWordDictationProgress(VOCABULARY, now)
    valid.items.mama = {
      level: 3,
      attempts: 4,
      correctAttempts: 3,
      lastReviewedAt: 20,
      nextDueAt: 30,
      lastResult: 'correct',
    }
    const hydrated = hydrateWordDictationProgress({
      ...valid,
      items: {
        mama: valid.items.mama,
        papa: { level: 99 },
        removed: valid.items.mama,
      },
      session: { currentId: 'removed', recentIds: ['removed', 'mama'] },
    }, VOCABULARY, 100)
    expect(hydrated.items.mama).toEqual(valid.items.mama)
    expect(hydrated.items.papa).toMatchObject({ level: 0, attempts: 0, nextDueAt: 100 })
    expect(hydrated.items.babushka).toBeDefined()
    expect(hydrated.items.removed).toBeUndefined()
    expect(hydrated.session.currentId).toBe('mama')
    expect(hydrateWordDictationProgress({ version: 2 }, VOCABULARY, 200).items.mama.level).toBe(0)
  })
})
