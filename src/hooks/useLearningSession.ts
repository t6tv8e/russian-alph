import { useCallback, useMemo, useState } from 'react'
import { ALPHABET, ALPHABET_BY_ID } from '../data/alphabet'
import { isTypedAnswerCorrect } from '../learning/answers'
import { buildChoices } from '../learning/choices'
import {
  getAnswerMode,
  recordAnswer,
  selectNextLetterId,
  selectPracticeLetterId,
} from '../learning/scheduler'
import type { AnswerMode, AnswerResult } from '../learning/types'
import { useStoredProgress } from './useStoredProgress'

export function useLearningSession() {
  const { progress, setProgress, resetProgress } = useStoredProgress()
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [currentId, setCurrentId] = useState<string | null>(() =>
    selectNextLetterId(ALPHABET, progress),
  )
  const [answerMode, setAnswerMode] = useState<AnswerMode>(() =>
    currentId ? getAnswerMode(progress.letters[currentId]) : 'choice',
  )
  const [phase, setPhase] = useState<'question' | 'feedback'>('question')
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [practiceMode, setPracticeMode] = useState(false)

  const currentLetter = currentId ? ALPHABET_BY_ID.get(currentId) ?? null : null
  const currentProgress = currentId ? progress.letters[currentId] : null

  const choices = useMemo(
    () => (currentLetter ? buildChoices(currentLetter, ALPHABET) : []),
    [currentLetter],
  )

  const gradeAnswer = useCallback(
    (correct: boolean, selectedId: string | null = null) => {
      if (!currentLetter || !currentProgress || phase === 'feedback') {
        return
      }

      setProgress(recordAnswer(progress, currentLetter.id, correct, answerMode))
      setSelectedChoiceId(selectedId)
      setResult(correct ? 'correct' : 'incorrect')
      setPhase('feedback')
    },
    [answerMode, currentLetter, currentProgress, phase, progress, setProgress],
  )

  const chooseAnswer = useCallback(
    (letterId: string) => {
      gradeAnswer(letterId === currentLetter?.id, letterId)
    },
    [currentLetter, gradeAnswer],
  )

  const confirmTypedAnswer = useCallback(() => {
    if (!currentLetter || !typedAnswer.trim()) {
      return
    }

    gradeAnswer(isTypedAnswerCorrect(currentLetter, typedAnswer))
  }, [currentLetter, gradeAnswer, typedAnswer])

  const prepareQuestion = useCallback((letterId: string | null, mode: AnswerMode) => {
    setCurrentId(letterId)
    setAnswerMode(mode)
    setPhase('question')
    setResult(null)
    setSelectedChoiceId(null)
    setTypedAnswer('')
  }, [])

  const continueSession = useCallback(() => {
    if (!currentLetter) {
      return
    }

    const nextRecentIds = [...recentIds, currentLetter.id].slice(-6)
    setRecentIds(nextRecentIds)

    const scheduledId = selectNextLetterId(
      ALPHABET,
      progress,
      Date.now(),
      nextRecentIds,
    )
    const nextId =
      scheduledId ??
      (practiceMode ? selectPracticeLetterId(ALPHABET, progress, nextRecentIds) : null)

    const nextMode = nextId ? getAnswerMode(progress.letters[nextId]) : 'choice'
    prepareQuestion(nextId, nextMode)
  }, [currentLetter, practiceMode, prepareQuestion, progress, recentIds])

  const startPractice = useCallback(() => {
    setPracticeMode(true)
    const nextId = selectPracticeLetterId(ALPHABET, progress, recentIds)
    const nextMode = nextId ? getAnswerMode(progress.letters[nextId]) : 'choice'
    prepareQuestion(nextId, nextMode)
  }, [prepareQuestion, progress, recentIds])

  const resetSession = useCallback(() => {
    resetProgress()
    setRecentIds([])
    setPracticeMode(false)
    prepareQuestion(ALPHABET[0]?.id ?? null, 'choice')
  }, [prepareQuestion, resetProgress])

  return {
    progress,
    currentLetter,
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
