import { describe, expect, it } from 'vitest'
import { VOCABULARY } from '../data/vocabulary'
import {
  buildVocabularyChoices,
  createVocabularyProgress,
  getVocabularyAnswerMode,
  getVocabularyOverallProgress,
  hydrateVocabularyProgress,
  isVocabularyAnswerCorrect,
  recordVocabularyAnswer,
  selectNextVocabularyWordId,
} from './vocabulary'

describe('vocabulary learning', () => {
  it('builds four unique meaning choices including the answer', () => {
    const choices = buildVocabularyChoices(VOCABULARY[0], VOCABULARY, () => 0.4)

    expect(choices).toHaveLength(4)
    expect(new Set(choices.map((choice) => choice.label)).size).toBe(4)
    expect(choices).toContainEqual({ wordId: 'mama', label: 'mother' })
  })

  it('accepts normalized synonyms during typed recall', () => {
    expect(isVocabularyAnswerCorrect(VOCABULARY[0], '  Mum ')).toBe(true)
    expect(isVocabularyAnswerCorrect(VOCABULARY[0], 'father')).toBe(false)
  })

  it('graduates a word from choices to typed recall after three successes', () => {
    const now = 1_000_000
    let progress = createVocabularyProgress(VOCABULARY, now)

    progress = recordVocabularyAnswer(progress, 'mama', true, 'choice', now)
    progress = recordVocabularyAnswer(progress, 'mama', true, 'choice', now + 1)
    progress = recordVocabularyAnswer(progress, 'mama', true, 'choice', now + 2)

    expect(progress.words.mama.level).toBe(3)
    expect(progress.words.mama.typingUnlocked).toBe(true)
    expect(getVocabularyAnswerMode(progress.words.mama)).toBe('typing')
  })

  it('prioritizes a missed word after the recent-question gap', () => {
    const now = 1_000_000
    let progress = createVocabularyProgress(VOCABULARY, now)
    progress = recordVocabularyAnswer(progress, 'mama', false, 'choice', now)
    progress = recordVocabularyAnswer(progress, 'papa', true, 'choice', now)
    progress = recordVocabularyAnswer(progress, 'babushka', true, 'choice', now)

    expect(selectNextVocabularyWordId(
      VOCABULARY,
      progress,
      now,
      ['papa', 'babushka'],
      () => 0,
    )).toBe('mama')
  })

  it('keeps valid stored items and initializes missing words', () => {
    const now = 1_000_000
    const progress = createVocabularyProgress(VOCABULARY, now)
    progress.words.mama.level = 2
    delete progress.words.papa

    const hydrated = hydrateVocabularyProgress(progress, VOCABULARY, now + 1)

    expect(hydrated.words.mama.level).toBe(2)
    expect(hydrated.words.papa.level).toBe(0)
  })

  it('derives progress from every word level', () => {
    let progress = createVocabularyProgress(VOCABULARY, 1_000_000)
    progress = recordVocabularyAnswer(progress, 'mama', true, 'choice', 1_000_000)

    expect(getVocabularyOverallProgress(progress)).toBe(1)
  })
})
