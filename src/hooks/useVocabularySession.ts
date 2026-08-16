import { useCallback, useMemo, useState } from 'react'
import { VOCABULARY, VOCABULARY_BY_ID } from '../data/vocabulary'
import {
  buildVocabularyChoices,
  getVocabularyAnswerMode,
  isVocabularyAnswerCorrect,
  recordVocabularyAnswer,
  selectNextVocabularyWordId,
  selectPracticeVocabularyWordId,
} from '../learning/vocabulary'
import type { AnswerMode, AnswerResult } from '../learning/types'
import type { VocabularySessionState } from '../learning/vocabularyTypes'
import { useStoredVocabularyProgress } from './useStoredVocabularyProgress'

export function useVocabularySession(): VocabularySessionState {
  const { progress, setProgress, resetProgress } = useStoredVocabularyProgress()
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [currentId, setCurrentId] = useState<string | null>(() =>
    selectNextVocabularyWordId(VOCABULARY, progress),
  )
  const [answerMode, setAnswerMode] = useState<AnswerMode>(() =>
    currentId ? getVocabularyAnswerMode(progress.words[currentId]) : 'choice',
  )
  const [phase, setPhase] = useState<'question' | 'feedback'>('question')
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [practiceMode, setPracticeMode] = useState(false)

  const currentWord = currentId ? VOCABULARY_BY_ID.get(currentId) ?? null : null
  const currentProgress = currentId ? progress.words[currentId] : null

  const choices = useMemo(
    () => (currentWord ? buildVocabularyChoices(currentWord, VOCABULARY) : []),
    [currentWord],
  )

  const gradeAnswer = useCallback(
    (correct: boolean, selectedId: string | null = null) => {
      if (!currentWord || !currentProgress || phase === 'feedback') {
        return
      }

      setProgress(recordVocabularyAnswer(
        progress,
        currentWord.id,
        correct,
        answerMode,
      ))
      setSelectedChoiceId(selectedId)
      setResult(correct ? 'correct' : 'incorrect')
      setPhase('feedback')
    },
    [answerMode, currentProgress, currentWord, phase, progress, setProgress],
  )

  const chooseAnswer = useCallback(
    (wordId: string) => {
      gradeAnswer(wordId === currentWord?.id, wordId)
    },
    [currentWord, gradeAnswer],
  )

  const confirmTypedAnswer = useCallback(() => {
    if (!currentWord || !typedAnswer.trim()) {
      return
    }

    gradeAnswer(isVocabularyAnswerCorrect(currentWord, typedAnswer))
  }, [currentWord, gradeAnswer, typedAnswer])

  const prepareQuestion = useCallback((wordId: string | null, mode: AnswerMode) => {
    setCurrentId(wordId)
    setAnswerMode(mode)
    setPhase('question')
    setResult(null)
    setSelectedChoiceId(null)
    setTypedAnswer('')
  }, [])

  const continueSession = useCallback(() => {
    if (!currentWord) {
      return
    }

    const nextRecentIds = [...recentIds, currentWord.id].slice(-6)
    setRecentIds(nextRecentIds)

    const scheduledId = selectNextVocabularyWordId(
      VOCABULARY,
      progress,
      Date.now(),
      nextRecentIds,
    )
    const nextId = scheduledId ?? (
      practiceMode
        ? selectPracticeVocabularyWordId(VOCABULARY, progress, nextRecentIds)
        : null
    )
    const nextMode = nextId
      ? getVocabularyAnswerMode(progress.words[nextId])
      : 'choice'

    prepareQuestion(nextId, nextMode)
  }, [currentWord, practiceMode, prepareQuestion, progress, recentIds])

  const startPractice = useCallback(() => {
    setPracticeMode(true)
    const nextId = selectPracticeVocabularyWordId(VOCABULARY, progress, recentIds)
    const nextMode = nextId
      ? getVocabularyAnswerMode(progress.words[nextId])
      : 'choice'
    prepareQuestion(nextId, nextMode)
  }, [prepareQuestion, progress, recentIds])

  const resetSession = useCallback(() => {
    resetProgress()
    setRecentIds([])
    setPracticeMode(false)
    prepareQuestion(VOCABULARY[0]?.id ?? null, 'choice')
  }, [prepareQuestion, resetProgress])

  return {
    progress,
    currentWord,
    currentProgress,
    answerMode,
    choices,
    phase,
    result,
    selectedChoiceId,
    typedAnswer,
    setTypedAnswer,
    chooseAnswer,
    confirmTypedAnswer,
    continueSession,
    startPractice,
    resetSession,
  }
}
