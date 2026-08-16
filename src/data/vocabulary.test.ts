import { describe, expect, it } from 'vitest'
import { VOCABULARY } from './vocabulary'

describe('beginner vocabulary', () => {
  it('contains unique, fully connected words', () => {
    const ids = new Set(VOCABULARY.map((word) => word.id))
    const russian = new Set(VOCABULARY.map((word) => word.russian))
    const english = new Set(VOCABULARY.map((word) => word.english))

    expect(VOCABULARY).toHaveLength(24)
    expect(ids.size).toBe(VOCABULARY.length)
    expect(russian.size).toBe(VOCABULARY.length)
    expect(english.size).toBe(VOCABULARY.length)

    for (const word of VOCABULARY) {
      expect(word.russian).toMatch(/[А-Яа-яЁё]/)
      expect(word.acceptedAnswers).toContain(word.english)
      expect(word.distractorIds).toHaveLength(3)
      expect(word.distractorIds.every((id) => ids.has(id))).toBe(true)
    }
  })
})
