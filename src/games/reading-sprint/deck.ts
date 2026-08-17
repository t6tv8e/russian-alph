import { ALPHABET } from '../../data/alphabet'
import type { ReadingCard, ReadingChoice } from './types'

const RUSSIAN_WORD = /^[а-яёьъ]+$/u

function latinSlug(value: string): string {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildReadingDeck(): ReadingCard[] {
  const cards: ReadingCard[] = []
  const russianSeen = new Set<string>()
  const idCounts = new Map<string, number>()

  for (const letter of ALPHABET) {
    for (const example of letter.examples) {
      const russian = example.russian.trim().toLocaleLowerCase('ru')
      const latin = example.latin.trim()

      if (
        cards.length >= 60 ||
        !russian ||
        !latin ||
        russianSeen.has(russian) ||
        !RUSSIAN_WORD.test(russian)
      ) {
        continue
      }

      russianSeen.add(russian)
      const baseId = `read-${latinSlug(latin)}`
      const collisionNumber = (idCounts.get(baseId) ?? 0) + 1
      idCounts.set(baseId, collisionNumber)

      cards.push({
        id: collisionNumber === 1 ? baseId : `${baseId}-${collisionNumber}`,
        russian,
        latin,
        english: example.english,
      })
    }

    if (cards.length >= 60) {
      break
    }
  }

  return cards
}

export const READING_DECK = buildReadingDeck()

export function isReadingChoiceCorrect(targetId: string, choiceId: string): boolean {
  return targetId === choiceId
}

function shuffled<T>(values: T[], random: () => number): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const value = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = value
  }
  return result
}

function cyrillicLength(value: string): number {
  return Array.from(value).length
}

export function buildReadingChoices(
  target: ReadingCard,
  deck: ReadingCard[] = READING_DECK,
  random: () => number = Math.random,
): ReadingChoice[] {
  const usedLabels = new Set([target.latin])
  const candidates = deck
    .map((card, deckIndex) => ({ card, deckIndex }))
    .filter(({ card }) => {
      if (card.id === target.id || usedLabels.has(card.latin)) {
        return false
      }
      usedLabels.add(card.latin)
      return true
    })
    .map(({ card, deckIndex }) => {
      const targetLetters = Array.from(target.russian)
      const candidateLetters = Array.from(card.russian)
      const score =
        Math.abs(cyrillicLength(target.russian) - cyrillicLength(card.russian)) +
        (targetLetters[0] === candidateLetters[0] ? 0 : 1) +
        (targetLetters.at(-1) === candidateLetters.at(-1) ? 0 : 1)
      return { card, deckIndex, score }
    })
    .sort((first, second) => first.score - second.score || first.deckIndex - second.deckIndex)

  const distractors = shuffled(candidates.slice(0, 6), random)
    .slice(0, 3)
    .map(({ card }) => ({ cardId: card.id, label: card.latin }))

  return shuffled(
    [{ cardId: target.id, label: target.latin }, ...distractors],
    random,
  )
}
