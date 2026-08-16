import type { CyrillicLetter } from './types'

export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .trim()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, '')
    .replace(/[-_.()]/g, '')
}

export function isTypedAnswerCorrect(letter: CyrillicLetter, value: string): boolean {
  const answer = normalizeAnswer(value)

  if (!answer) {
    return false
  }

  return letter.acceptedAnswers.some((accepted) => normalizeAnswer(accepted) === answer)
}
