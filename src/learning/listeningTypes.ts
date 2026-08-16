export type ListeningAnswerResult = 'correct' | 'incorrect'

export interface ListeningLetterProgress {
  level: number
  streak: number
  attempts: number
  correctAttempts: number
  lapses: number
  lastReviewedAt: number | null
  nextDueAt: number
  lastResult: ListeningAnswerResult | null
}

export interface ListeningProgress {
  version: 1
  letters: Record<string, ListeningLetterProgress>
  updatedAt: number
}

export interface ListeningChoice {
  letterId: string
  uppercase: string
  lowercase: string
}
