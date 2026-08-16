import type { AnswerMode, AnswerResult } from './types'

export interface VocabularyWord {
  id: string
  russian: string
  latin: string
  english: string
  acceptedAnswers: string[]
  distractorIds: string[]
}

export interface VocabularyWordProgress {
  level: number
  choiceCorrectCount: number
  typingUnlocked: boolean
  attempts: number
  correctAttempts: number
  lastReviewedAt: number | null
  nextDueAt: number
  lastResult: AnswerResult | null
}

export interface VocabularyProgress {
  version: 1
  words: Record<string, VocabularyWordProgress>
  updatedAt: number
}

export interface VocabularyChoice {
  wordId: string
  label: string
}

export interface VocabularySessionState {
  progress: VocabularyProgress
  currentWord: VocabularyWord | null
  currentProgress: VocabularyWordProgress | null
  answerMode: AnswerMode
  choices: VocabularyChoice[]
  phase: 'question' | 'feedback'
  result: AnswerResult | null
  selectedChoiceId: string | null
  typedAnswer: string
  setTypedAnswer: (value: string) => void
  chooseAnswer: (wordId: string) => void
  confirmTypedAnswer: () => void
  continueSession: () => void
  startPractice: () => void
  resetSession: () => void
}
