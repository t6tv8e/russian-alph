import { describe, expect, it } from 'vitest'
import { ALPHABET } from '../data/alphabet'
import { buildListeningChoices } from './listeningChoices'

describe('listening choices', () => {
  it('uses every letter’s hand-authored confusion group', () => {
    for (const letter of ALPHABET) {
      const choices = buildListeningChoices(letter, ALPHABET, () => 0.42)
      const ids = new Set(choices.map((choice) => choice.letterId))

      expect(choices).toHaveLength(4)
      expect(ids.size).toBe(4)
      expect(ids).toEqual(new Set([letter.id, ...letter.distractorIds]))
      expect(choices.every((choice) => choice.uppercase.length > 0)).toBe(true)
    }
  })
})
