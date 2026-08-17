import { describe, expect, it } from 'vitest'
import { ALPHABET } from '../../data/alphabet'
import {
  buildReadingChoices,
  buildReadingDeck,
  isReadingChoiceCorrect,
  READING_DECK,
} from './deck'

describe('Reading Sprint deck', () => {
  it('derives exactly 60 unique cards from ALPHABET in authored order', () => {
    const deck = buildReadingDeck()

    expect(deck).toHaveLength(60)
    expect(new Set(deck.map((card) => card.russian))).toHaveLength(60)
    expect(new Set(deck.map((card) => card.id))).toHaveLength(60)
    expect(deck[0]).toEqual({
      id: 'read-arbuz',
      russian: 'арбуз',
      latin: 'arbuz',
      english: 'watermelon',
    })
    expect(deck).toEqual(READING_DECK)

    const authoredExamples = ALPHABET.flatMap((letter) => letter.examples)
    for (const card of deck) {
      expect(authoredExamples).toContainEqual({
        russian: expect.stringMatching(new RegExp(`^${card.russian}$`, 'iu')),
        latin: card.latin,
        english: card.english,
      })
      expect(card.russian).toMatch(/^[а-яёьъ]+$/u)
    }
  })

  it('ranks six nearest candidates, seeded-shuffles, and returns four unique Latin labels', () => {
    const target = READING_DECK[0]
    const choices = buildReadingChoices(target, READING_DECK, () => 0)

    expect(choices).toEqual([
      { cardId: 'read-karta', label: 'karta' },
      { cardId: 'read-sakhar', label: 'sakhar' },
      { cardId: 'read-bilet', label: 'bilet' },
      { cardId: target.id, label: target.latin },
    ])
    expect(new Set(choices.map((choice) => choice.label))).toHaveLength(4)
    expect(buildReadingChoices(target, READING_DECK, () => 0)).toEqual(choices)
    expect(isReadingChoiceCorrect(target.id, target.id)).toBe(true)
    expect(isReadingChoiceCorrect(target.id, choices[0].cardId)).toBe(false)
  })
})
