export type AnswerResult = 'correct' | 'incorrect'

export interface WordDictationItemProgress {
  level: number
  attempts: number
  correctAttempts: number
  lastReviewedAt: number | null
  nextDueAt: number
  lastResult: AnswerResult | null
}

export interface WordDictationSession {
  currentId: string | null
  recentIds: string[]
  practiceMode: boolean
  questionLevel: number
  placedTileIds: string[]
  hasPlayed: boolean
  phase: 'question' | 'feedback'
  result: AnswerResult | null
  learnerAnswer: string
}

export interface WordDictationProgress {
  version: 1
  items: Record<string, WordDictationItemProgress>
  updatedAt: number
  session: WordDictationSession
}

export interface LetterTile {
  id: string
  value: string
  distractor: boolean
}
