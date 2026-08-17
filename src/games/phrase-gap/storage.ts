import { PHRASE_GAPS } from './content'
import {
  createPhraseGapProgress,
  hydratePhraseGapProgress,
  type PhraseGapProgress,
} from './progress'

export const PHRASE_GAP_STORAGE_KEY = 'bystro-bukvy-phrase-gap-progress-v1'

export function readPhraseGapProgress(): PhraseGapProgress {
  if (typeof window === 'undefined') return createPhraseGapProgress(PHRASE_GAPS)
  try {
    const stored = window.localStorage.getItem(PHRASE_GAP_STORAGE_KEY)
    return hydratePhraseGapProgress(stored ? JSON.parse(stored) : null, PHRASE_GAPS)
  } catch {
    return createPhraseGapProgress(PHRASE_GAPS)
  }
}

export function writePhraseGapProgress(progress: PhraseGapProgress): void {
  try {
    window.localStorage.setItem(PHRASE_GAP_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Practice remains available when local storage is blocked or full.
  }
}
