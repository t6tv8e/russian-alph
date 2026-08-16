export const RUSSIAN_LANGUAGE_TAG = 'ru-RU'
export const RUSSIAN_LANGUAGE_PREFIX = 'ru'
export const LEARNING_SPEECH_RATE = 0.82

export function findRussianVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  return voices.find((voice) =>
    voice.lang.toLocaleLowerCase('en').startsWith(RUSSIAN_LANGUAGE_PREFIX),
  )
}
