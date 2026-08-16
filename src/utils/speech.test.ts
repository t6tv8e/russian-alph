import { describe, expect, it } from 'vitest'
import { findRussianVoice } from './speech'

function voice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang } as SpeechSynthesisVoice
}

describe('Russian speech voice selection', () => {
  it('selects a Russian voice regardless of region or case', () => {
    const voices = [voice('English', 'en-US'), voice('Milena', 'RU-ru')]

    expect(findRussianVoice(voices)?.name).toBe('Milena')
  })

  it('returns undefined when no Russian voice is installed', () => {
    expect(findRussianVoice([voice('English', 'en-US')])).toBeUndefined()
  })
})
