import { useCallback, useEffect, useState } from 'react'
import { VOCABULARY } from '../data/vocabulary'
import {
  createVocabularyProgress,
  hydrateVocabularyProgress,
} from '../learning/vocabulary'
import type { VocabularyProgress } from '../learning/vocabularyTypes'

export const VOCABULARY_STORAGE_KEY = 'bystro-bukvy-vocabulary-progress-v1'

function readStoredProgress(): VocabularyProgress {
  if (typeof window === 'undefined') {
    return createVocabularyProgress(VOCABULARY)
  }

  try {
    const stored = window.localStorage.getItem(VOCABULARY_STORAGE_KEY)
    return hydrateVocabularyProgress(stored ? JSON.parse(stored) : null, VOCABULARY)
  } catch {
    return createVocabularyProgress(VOCABULARY)
  }
}

export function useStoredVocabularyProgress() {
  const [progress, setProgress] = useState<VocabularyProgress>(readStoredProgress)

  useEffect(() => {
    try {
      window.localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(progress))
    } catch {
      // Learning still works when storage is unavailable or full.
    }
  }, [progress])

  const resetProgress = useCallback(() => {
    setProgress(createVocabularyProgress(VOCABULARY))
  }, [])

  return { progress, setProgress, resetProgress }
}
