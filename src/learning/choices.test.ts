import { describe, expect, it } from 'vitest'
import { ALPHABET, ALPHABET_BY_ID } from '../data/alphabet'
import { buildChoices } from './choices'

describe('multiple-choice generation', () => {
  it('returns the correct answer and three unique distractors', () => {
    const letter = ALPHABET_BY_ID.get('zhe')!
    const choices = buildChoices(letter, ALPHABET, () => 0.42)

    expect(choices).toHaveLength(4)
    expect(choices.some((choice) => choice.letterId === letter.id)).toBe(true)
    expect(new Set(choices.map((choice) => choice.label)).size).toBe(4)
  })
})
