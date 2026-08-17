export interface ReadingCard {
  id: string
  russian: string
  latin: string
  english: string
}

export interface ReadingChoice {
  cardId: string
  label: string
}

export type AnswerResult = 'correct' | 'incorrect'
export type ReadingSprintMode = 'sprint' | 'relaxed'

export interface ReadingItemProgress {
  level: number
  attempts: number
  correctAttempts: number
  lapses: number
  lastReviewedAt: number | null
  nextDueAt: number
  lastResult: AnswerResult | null
}

export interface ReadingSprintProgress {
  version: 1
  items: Record<string, ReadingItemProgress>
  updatedAt: number
  bestSprintScore: number
  bestSprintAccuracy: number
  bestRelaxedAccuracy: number
}
