import { useCallback, useEffect, useMemo, useState } from 'react'
import { ALPHABET, ALPHABET_BY_ID } from '../data/alphabet'
import { buildListeningChoices } from '../learning/listeningChoices'
import {
  createListeningProgress,
  hydrateListeningProgress,
  recordListeningAnswer,
  selectListeningPracticeLetterId,
  selectNextListeningLetterId,
} from '../learning/listeningScheduler'
import type { ListeningAnswerResult, ListeningProgress } from '../learning/listeningTypes'

export const LISTENING_STORAGE_KEY = 'bystro-bukvy-listening-progress-v1'

type ListeningPhase = 'question' | 'feedback'

function createQuestionRandom(questionNumber: number): () => number {
  let state = questionNumber + 1

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    return state / 4_294_967_296
  }
}

function readStoredListeningProgress(): ListeningProgress {
  if (typeof window === 'undefined') {
    return createListeningProgress(ALPHABET)
  }

  try {
    const stored = window.localStorage.getItem(LISTENING_STORAGE_KEY)
    return hydrateListeningProgress(stored ? JSON.parse(stored) : null, ALPHABET)
  } catch {
    return createListeningProgress(ALPHABET)
  }
}

export function useListeningSession() {
  const [progress, setProgress] = useState<ListeningProgress>(readStoredListeningProgress)
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [currentId, setCurrentId] = useState<string | null>(() =>
    selectNextListeningLetterId(ALPHABET, progress),
  )
  const [phase, setPhase] = useState<ListeningPhase>('question')
  const [hasListened, setHasListened] = useState(false)
  const [result, setResult] = useState<ListeningAnswerResult | null>(null)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [practiceMode, setPracticeMode] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)

  useEffect(() => {
    try {
      window.localStorage.setItem(LISTENING_STORAGE_KEY, JSON.stringify(progress))
    } catch {
      // Listening practice still works when storage is blocked or full.
    }
  }, [progress])

  const currentLetter = currentId ? ALPHABET_BY_ID.get(currentId) ?? null : null
  const choices = useMemo(
    () => (
      currentLetter
        ? buildListeningChoices(currentLetter, ALPHABET, createQuestionRandom(questionNumber))
        : []
    ),
    [currentLetter, questionNumber],
  )

  const markListened = useCallback(() => {
    if (currentId && phase === 'question') {
      setHasListened(true)
    }
  }, [currentId, phase])

  const chooseAnswer = useCallback(
    (letterId: string) => {
      if (!currentLetter || phase !== 'question' || !hasListened) {
        return
      }

      const correct = letterId === currentLetter.id
      setProgress(recordListeningAnswer(progress, currentLetter.id, correct))
      setSelectedChoiceId(letterId)
      setResult(correct ? 'correct' : 'incorrect')
      setPhase('feedback')
    },
    [currentLetter, hasListened, phase, progress],
  )

  const prepareQuestion = useCallback((letterId: string | null) => {
    setCurrentId(letterId)
    setPhase('question')
    setHasListened(false)
    setResult(null)
    setSelectedChoiceId(null)
    setQuestionNumber((number) => number + 1)
  }, [])

  const continueSession = useCallback(() => {
    if (!currentLetter || phase !== 'feedback') {
      return
    }

    const nextRecentIds = [...recentIds, currentLetter.id].slice(-6)
    setRecentIds(nextRecentIds)

    const scheduledId = selectNextListeningLetterId(
      ALPHABET,
      progress,
      Date.now(),
      nextRecentIds,
    )
    const nextId =
      scheduledId ??
      (practiceMode
        ? selectListeningPracticeLetterId(ALPHABET, progress, nextRecentIds)
        : null)

    prepareQuestion(nextId)
  }, [currentLetter, phase, practiceMode, prepareQuestion, progress, recentIds])

  const startPractice = useCallback(() => {
    setPracticeMode(true)
    prepareQuestion(selectListeningPracticeLetterId(ALPHABET, progress, recentIds))
  }, [prepareQuestion, progress, recentIds])

  const endPractice = useCallback(() => {
    setPracticeMode(false)
    prepareQuestion(null)
  }, [prepareQuestion])

  return {
    progress,
    currentLetter,
    choices,
    phase,
    hasListened,
    result,
    selectedChoiceId,
    practiceMode,
    questionNumber,
    markListened,
    chooseAnswer,
    continueSession,
    startPractice,
    endPractice,
  }
}
