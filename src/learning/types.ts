export interface WordExample {
  russian: string
  latin: string
  english: string
}

export interface CyrillicLetter {
  id: string
  uppercase: string
  lowercase: string
  answer: string
  ipa: string
  pronunciation: string
  spokenName: string
  acceptedAnswers: string[]
  distractorIds: string[]
  examples: WordExample[]
}

export type AnswerMode = 'choice' | 'typing'
export type AnswerResult = 'correct' | 'incorrect'

export interface LetterProgress {
  level: number
  choiceCorrectCount: number
  typingUnlocked: boolean
  attempts: number
  correctAttempts: number
  lastReviewedAt: number | null
  nextDueAt: number
  lastResult: AnswerResult | null
}

export interface LearningProgress {
  version: 1
  letters: Record<string, LetterProgress>
  updatedAt: number
}

export interface Choice {
  letterId: string
  label: string
}
