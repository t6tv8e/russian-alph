import { describe, expect, it } from 'vitest'
import { ALPHABET_BY_ID } from '../data/alphabet'
import { isTypedAnswerCorrect, normalizeAnswer } from './answers'

describe('typed answers', () => {
  it('normalizes spacing, punctuation, and case', () => {
    expect(normalizeAnswer('  Short-I ')).toBe('shorti')
    expect(normalizeAnswer('SOFT SIGN')).toBe('softsign')
  })

  it('accepts documented transliteration aliases', () => {
    const yo = ALPHABET_BY_ID.get('yo')!
    const softSign = ALPHABET_BY_ID.get('soft-sign')!

    expect(isTypedAnswerCorrect(yo, 'YO')).toBe(true)
    expect(isTypedAnswerCorrect(yo, 'ë')).toBe(true)
    expect(isTypedAnswerCorrect(softSign, "'")).toBe(true)
    expect(isTypedAnswerCorrect(yo, 'e')).toBe(false)
  })
})
