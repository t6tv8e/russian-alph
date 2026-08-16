import type { Choice, CyrillicLetter } from './types'

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }

  return result
}

export function buildChoices(
  letter: CyrillicLetter,
  alphabet: CyrillicLetter[],
  random: () => number = Math.random,
): Choice[] {
  const byId = new Map(alphabet.map((item) => [item.id, item]))
  const selected: CyrillicLetter[] = [letter]
  const usedLabels = new Set([letter.answer])

  const addCandidate = (candidate: CyrillicLetter | undefined) => {
    if (!candidate || candidate.id === letter.id || usedLabels.has(candidate.answer)) {
      return
    }

    selected.push(candidate)
    usedLabels.add(candidate.answer)
  }

  letter.distractorIds.forEach((id) => addCandidate(byId.get(id)))

  for (const candidate of shuffled(alphabet, random)) {
    if (selected.length >= 4) {
      break
    }
    addCandidate(candidate)
  }

  return shuffled(selected.slice(0, 4), random).map((item) => ({
    letterId: item.id,
    label: item.answer,
  }))
}
