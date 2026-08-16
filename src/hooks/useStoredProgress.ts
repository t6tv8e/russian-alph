import { useCallback, useEffect, useState } from 'react'
import { ALPHABET } from '../data/alphabet'
import {
  createLearningProgress,
  hydrateLearningProgress,
} from '../learning/scheduler'
import type { LearningProgress } from '../learning/types'

export const STORAGE_KEY = 'bystro-bukvy-progress-v1'

function readStoredProgress(): LearningProgress {
  if (typeof window === 'undefined') {
    return createLearningProgress(ALPHABET)
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return hydrateLearningProgress(stored ? JSON.parse(stored) : null, ALPHABET)
  } catch {
    return createLearningProgress(ALPHABET)
  }
}

export function useStoredProgress() {
  const [progress, setProgress] = useState<LearningProgress>(readStoredProgress)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch {
      // Learning still works when storage is unavailable or full.
    }
  }, [progress])

  const resetProgress = useCallback(() => {
    setProgress(createLearningProgress(ALPHABET))
  }, [])

  return { progress, setProgress, resetProgress }
}
