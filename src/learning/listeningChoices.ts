import type { CyrillicLetter } from './types'
import type { ListeningChoice } from './listeningTypes'

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }

  return result
}

/**
 * Builds a Cyrillic answer set from each letter's hand-authored confusion group.
 * The alphabet data supplies three sound/shape neighbours; the fallback keeps the
 * function safe for partial or future alphabets.
 */
export function buildListeningChoices(
  letter: CyrillicLetter,
  alphabet: readonly CyrillicLetter[],
  random: () => number = Math.random,
): ListeningChoice[] {
  const byId = new Map(alphabet.map((item) => [item.id, item]))
  const selected: CyrillicLetter[] = [letter]
  const selectedIds = new Set([letter.id])

  const addCandidate = (candidate: CyrillicLetter | undefined) => {
    if (!candidate || selectedIds.has(candidate.id) || selected.length >= 4) {
      return
    }

    selected.push(candidate)
    selectedIds.add(candidate.id)
  }

  for (const id of letter.distractorIds) {
    addCandidate(byId.get(id))
  }

  if (selected.length < 4) {
    for (const candidate of shuffled(alphabet, random)) {
      addCandidate(candidate)
    }
  }

  return shuffled(selected, random).map((item) => ({
    letterId: item.id,
    uppercase: item.uppercase,
    lowercase: item.lowercase,
  }))
}
