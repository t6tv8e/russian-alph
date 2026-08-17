import { describe, expect, it } from 'vitest'
import { VOCABULARY } from '../../data/vocabulary'
import {
  buildWordBuilderTiles,
  createWordBuilderProgress,
  getWordBuilderMode,
  gradeWordBuilderAnswer,
  hydrateWordBuilderProgress,
  recordWordBuilderAnswer,
  selectDistractorCharacters,
  selectNextWordBuilderId,
  selectWeakestWordBuilderId,
  validateWordBuilderContent,
} from './wordBuilder'

const word = (id: string) => VOCABULARY.find((item) => item.id === id)!

describe('Word Builder content and tile generation', () => {
  it('uses all 24 valid vocabulary records in authored order', () => {
    expect(VOCABULARY).toHaveLength(24)
    expect(VOCABULARY.map((item) => item.id).slice(0, 3)).toEqual(['mama', 'papa', 'babushka'])
    expect(validateWordBuilderContent(VOCABULARY)).toEqual([])
  })

  it('gives repeated letters stable, independently selectable occurrence IDs', () => {
    const tiles = buildWordBuilderTiles(word('mama'), VOCABULARY, 0, () => 0.4)
    expect(tiles.map((tile) => tile.id).sort()).toEqual([
      'mama-а-0', 'mama-а-1', 'mama-м-0', 'mama-м-1',
    ])
    expect(new Set(tiles.map((tile) => tile.id)).size).toBe(4)
  })

  it('prevents an accidental solved shuffle by rotating the bank', () => {
    const target = word('dom')
    const solvedRandom = () => 0.999999
    const tiles = buildWordBuilderTiles(target, VOCABULARY, 0, solvedRandom)
    expect(tiles.map((tile) => tile.value).join('')).not.toBe(target.russian)
    expect(tiles.map((tile) => tile.value).sort()).toEqual([...target.russian].sort())
  })

  it('fades scaffolds exactly and adds two unique distractors only at levels 4–5', () => {
    expect(getWordBuilderMode(0)).toEqual({ showTransliteration: true, distractorCount: 0 })
    expect(getWordBuilderMode(1)).toEqual({ showTransliteration: true, distractorCount: 0 })
    expect(getWordBuilderMode(2)).toEqual({ showTransliteration: false, distractorCount: 0 })
    expect(getWordBuilderMode(3)).toEqual({ showTransliteration: false, distractorCount: 0 })
    expect(getWordBuilderMode(4)).toEqual({ showTransliteration: false, distractorCount: 2 })
    expect(getWordBuilderMode(5)).toEqual({ showTransliteration: false, distractorCount: 2 })
    expect(buildWordBuilderTiles(word('dom'), VOCABULARY, 3, () => 0.2)).toHaveLength(3)
    const highTiles = buildWordBuilderTiles(word('dom'), VOCABULARY, 4, () => 0.2)
    expect(highTiles).toHaveLength(5)
    expect(highTiles.filter((tile) => tile.kind === 'distractor')).toHaveLength(2)
    expect(new Set(selectDistractorCharacters(word('dom'), VOCABULARY)).size).toBe(2)
  })

  it('grades only ordered Cyrillic values, case-insensitively, never English synonyms', () => {
    expect(gradeWordBuilderAnswer([...word('mama').russian], word('mama'))).toBe(true)
    expect(gradeWordBuilderAnswer([...word('mama').russian.toUpperCase()], word('mama'))).toBe(true)
    expect(word('mama').acceptedAnswers).toContain('mom')
    expect(gradeWordBuilderAnswer([...'mom'], word('mama'))).toBe(false)
    expect(gradeWordBuilderAnswer([...'маам'], word('mama'))).toBe(false)
  })
})

describe('Word Builder scheduling and hydration', () => {
  it('makes misses immediately due and applies the shared level intervals', () => {
    const now = 1_000_000
    let progress = createWordBuilderProgress(VOCABULARY, now)
    progress = recordWordBuilderAnswer(progress, 'mama', true, now)
    expect(progress.items.mama).toMatchObject({ level: 1, nextDueAt: now, lastResult: 'correct' })
    progress = recordWordBuilderAnswer(progress, 'mama', true, now)
    expect(progress.items.mama).toMatchObject({ level: 2, nextDueAt: now + 10 * 60 * 1000 })
    progress = recordWordBuilderAnswer(progress, 'mama', false, now + 10)
    expect(progress.items.mama).toMatchObject({ level: 1, nextDueAt: now + 10, lastResult: 'incorrect', lapses: 1 })
  })

  it('prioritizes missed due items while respecting the two-item gap', () => {
    const now = 20_000
    let progress = createWordBuilderProgress(VOCABULARY, now)
    progress = recordWordBuilderAnswer(progress, 'mama', false, now)
    progress = recordWordBuilderAnswer(progress, 'papa', true, now)
    expect(selectNextWordBuilderId(VOCABULARY, progress, now)).toBe('mama')
    expect(selectNextWordBuilderId(VOCABULARY, progress, now, ['papa', 'mama'])).toBe('babushka')
  })

  it('repairs malformed known items, adds new items, and ignores unknown IDs', () => {
    const fresh = createWordBuilderProgress(VOCABULARY, 10)
    const valid = { ...fresh.items.mama, level: 3, attempts: 4, correctAttempts: 3 }
    const hydrated = hydrateWordBuilderProgress({
      version: 1,
      updatedAt: 5,
      items: { mama: valid, papa: { level: 99 }, removed: valid },
    }, VOCABULARY, 10)
    expect(hydrated.items.mama.level).toBe(3)
    expect(hydrated.items.papa).toEqual(fresh.items.papa)
    expect(hydrated.items.babushka).toEqual(fresh.items.babushka)
    expect(hydrated.items.removed).toBeUndefined()
    expect(Object.keys(hydrated.items)).toHaveLength(24)
    expect(hydrateWordBuilderProgress({ version: 2, items: {} }, VOCABULARY, 10)).toEqual(fresh)
  })

  it('selects weakest by level, accuracy, lapses, and oldest review', () => {
    const progress = createWordBuilderProgress(VOCABULARY, 0)
    for (const [index, item] of Object.values(progress.items).entries()) {
      item.level = 3
      item.attempts = 2
      item.correctAttempts = 2
      item.lastReviewedAt = 100 + index
    }
    progress.items.papa.level = 1
    progress.items.papa.correctAttempts = 1
    progress.items.mama.level = 1
    progress.items.mama.correctAttempts = 1
    progress.items.mama.lapses = 2
    expect(selectWeakestWordBuilderId(VOCABULARY, progress)).toBe('mama')
  })
})
