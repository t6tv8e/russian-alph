import type { PhraseGapItem } from './content'

export interface PhraseGapChoice {
  id: string
  text: string
  correct: boolean
}

export type PhraseGapMode = 'choice' | 'typed'

export function getPhraseGapMode(level: number): PhraseGapMode {
  return level <= 2 ? 'choice' : 'typed'
}

export function shuffleValues<T>(values: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

export function buildPhraseGapChoices(
  item: PhraseGapItem,
  random: () => number = Math.random,
): PhraseGapChoice[] {
  const values = [item.answer, ...item.distractors]
  if (new Set(values).size !== 4) throw new Error(`${item.id} must have four unique choices.`)
  return shuffleValues(values, random).map((text) => ({
    id: `${item.id}-${text}`,
    text,
    correct: text === item.answer,
  }))
}

export function normalizeTypedGap(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ru-RU')
    .replace(/[‘’‚‛′ʼ`´]/gu, "'")
    .replace(/[‐‑‒–—−]/gu, '-')
    .replace(/。/gu, '.')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/^\.+|\.+$/gu, '')
}

export function isTypedGapCorrect(value: string, item: PhraseGapItem): boolean {
  const normalized = normalizeTypedGap(value)
  return normalized === normalizeTypedGap(item.answer) || normalized === normalizeTypedGap(item.latinAnswer)
}

export function createSeededRandom(seedText: string): () => number {
  let seed = 2166136261
  for (const character of seedText) {
    seed ^= character.codePointAt(0) ?? 0
    seed = Math.imul(seed, 16777619)
  }
  return () => {
    seed += 0x6d2b79f5
    let value = seed
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
