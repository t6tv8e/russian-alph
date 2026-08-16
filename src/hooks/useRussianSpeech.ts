import { useCallback, useEffect, useState } from 'react'
import {
  findRussianVoice,
  LEARNING_SPEECH_RATE,
  RUSSIAN_LANGUAGE_TAG,
} from '../utils/speech'

export interface RussianSpeechController {
  canSpeak: boolean
  speakingId: string | null
  speak: (text: string, id: string) => void
  unavailableReason: string | null
}

function browserSupportsSpeech(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  )
}

export function useRussianSpeech(): RussianSpeechController {
  const [supported] = useState(browserSupportsSpeech)
  const [hasRussianVoice, setHasRussianVoice] = useState<boolean | null>(null)
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  useEffect(() => {
    if (!supported) {
      return
    }

    const synthesis = window.speechSynthesis
    const updateVoices = () => {
      const voices = synthesis.getVoices()
      setHasRussianVoice(voices.length === 0 ? null : Boolean(findRussianVoice(voices)))
    }

    updateVoices()
    synthesis.addEventListener('voiceschanged', updateVoices)

    return () => {
      synthesis.removeEventListener('voiceschanged', updateVoices)
      synthesis.cancel()
    }
  }, [supported])

  const speak = useCallback(
    (text: string, id: string) => {
      if (!supported || hasRussianVoice === false) {
        return
      }

      const synthesis = window.speechSynthesis
      const utterance = new SpeechSynthesisUtterance(text)
      const voice = findRussianVoice(synthesis.getVoices())

      synthesis.cancel()
      utterance.lang = RUSSIAN_LANGUAGE_TAG
      utterance.rate = LEARNING_SPEECH_RATE
      if (voice) {
        utterance.voice = voice
      }

      const finish = () => {
        setSpeakingId((currentId) => (currentId === id ? null : currentId))
      }
      utterance.onend = finish
      utterance.onerror = finish

      setSpeakingId(id)
      synthesis.speak(utterance)
    },
    [hasRussianVoice, supported],
  )

  const canSpeak = supported && hasRussianVoice !== false
  const unavailableReason = !supported
    ? 'Speech playback is not supported by this browser.'
    : hasRussianVoice === false
      ? 'Install a Russian system voice to enable pronunciation playback.'
      : null

  return { canSpeak, speakingId, speak, unavailableReason }
}
