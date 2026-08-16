import { describe, expect, it } from 'vitest'
import { ALPHABET } from './alphabet'

describe('alphabet content', () => {
  it('contains all 33 unique Russian letters', () => {
    expect(ALPHABET).toHaveLength(33)
    expect(new Set(ALPHABET.map((letter) => letter.uppercase)).size).toBe(33)
    expect(new Set(ALPHABET.map((letter) => letter.answer)).size).toBe(33)
  })

  it('has valid distractors and examples containing each target letter', () => {
    const ids = new Set(ALPHABET.map((letter) => letter.id))

    for (const letter of ALPHABET) {
      expect(letter.acceptedAnswers.length).toBeGreaterThan(0)
      expect(letter.distractorIds).toHaveLength(3)
      expect(letter.distractorIds.every((id) => ids.has(id))).toBe(true)
      expect(letter.examples.length).toBeGreaterThanOrEqual(4)
      expect(letter.examples.every((example) => example.latin.length > 0)).toBe(true)
      expect(
        letter.examples.every((example) =>
          example.russian.toLocaleLowerCase('ru').includes(letter.lowercase),
        ),
      ).toBe(true)
    }
  })
})
