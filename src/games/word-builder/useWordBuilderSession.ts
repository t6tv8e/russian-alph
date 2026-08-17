import { useCallback, useState } from 'react'
import { VOCABULARY } from '../../data/vocabulary'
import type { VocabularyWord } from '../../learning/vocabularyTypes'
import {
  buildWordBuilderTiles,
  createWordBuilderProgress,
  gradeWordBuilderAnswer,
  hydrateWordBuilderProgress,
  recordWordBuilderAnswer,
  selectNextWordBuilderId,
  selectWeakestWordBuilderId,
  WORD_BUILDER_STORAGE_KEY,
  type WordBuilderProgress,
  type WordBuilderResult,
  type WordBuilderTile,
} from './wordBuilder'

function loadProgress(): WordBuilderProgress {
  if (typeof window === 'undefined') return createWordBuilderProgress(VOCABULARY)
  try {
    const stored = window.localStorage.getItem(WORD_BUILDER_STORAGE_KEY)
    return hydrateWordBuilderProgress(stored ? JSON.parse(stored) : null, VOCABULARY)
  } catch {
    return createWordBuilderProgress(VOCABULARY)
  }
}

function saveProgress(progress: WordBuilderProgress) {
  try {
    window.localStorage.setItem(WORD_BUILDER_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // A full or unavailable store must not prevent practice.
  }
}

function findWord(id: string | null): VocabularyWord | null {
  return id ? VOCABULARY.find((word) => word.id === id) ?? null : null
}

export interface WordBuilderSession {
  progress: WordBuilderProgress
  currentWord: VocabularyWord | null
  questionLevel: number
  tiles: WordBuilderTile[]
  placedIds: string[]
  result: WordBuilderResult | null
  learnerAnswer: string
  practiceMode: boolean
  placeTile: (id: string) => void
  removeTile: (id: string) => void
  undo: () => void
  clear: () => void
  check: () => void
  continueSession: () => void
  startPractice: () => void
}

export function useWordBuilderSession(random: () => number = Math.random): WordBuilderSession {
  const [progress, setProgress] = useState(loadProgress)
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [practiceMode, setPracticeMode] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(() =>
    selectNextWordBuilderId(VOCABULARY, progress),
  )
  const initialWord = findWord(currentId)
  const [questionLevel, setQuestionLevel] = useState(() => currentId ? progress.items[currentId].level : 0)
  const [tiles, setTiles] = useState<WordBuilderTile[]>(() =>
    initialWord ? buildWordBuilderTiles(initialWord, VOCABULARY, questionLevel, random) : [],
  )
  const [placedIds, setPlacedIds] = useState<string[]>([])
  const [result, setResult] = useState<WordBuilderResult | null>(null)
  const [learnerAnswer, setLearnerAnswer] = useState('')
  const currentWord = findWord(currentId)

  const prepareQuestion = useCallback((id: string | null, source: WordBuilderProgress) => {
    const word = findWord(id)
    const level = id ? source.items[id].level : 0
    setCurrentId(id)
    setQuestionLevel(level)
    setTiles(word ? buildWordBuilderTiles(word, VOCABULARY, level, random) : [])
    setPlacedIds([])
    setResult(null)
    setLearnerAnswer('')
  }, [random])

  const placeTile = useCallback((id: string) => {
    if (result || !currentWord) return
    setPlacedIds((current) => {
      if (current.includes(id) || current.length >= currentWord.russian.length) return current
      return [...current, id]
    })
  }, [currentWord, result])

  const removeTile = useCallback((id: string) => {
    if (result) return
    setPlacedIds((current) => current.filter((tileId) => tileId !== id))
  }, [result])

  const undo = useCallback(() => {
    if (result) return
    setPlacedIds((current) => current.slice(0, -1))
  }, [result])

  const clear = useCallback(() => {
    if (!result) setPlacedIds([])
  }, [result])

  const check = useCallback(() => {
    if (result || !currentWord || placedIds.length !== currentWord.russian.length) return
    const values = placedIds.map((id) => tiles.find((tile) => tile.id === id)?.value ?? '')
    const correct = gradeWordBuilderAnswer(values, currentWord)
    const nextProgress = recordWordBuilderAnswer(progress, currentWord.id, correct)
    const nextRecent = [...recentIds, currentWord.id].slice(-2)
    setProgress(nextProgress)
    saveProgress(nextProgress)
    setRecentIds(nextRecent)
    setLearnerAnswer(values.join(''))
    setResult(correct ? 'correct' : 'incorrect')
  }, [currentWord, placedIds, progress, recentIds, result, tiles])

  const continueSession = useCallback(() => {
    if (!result) return
    const nextId = practiceMode
      ? selectWeakestWordBuilderId(VOCABULARY, progress, recentIds)
      : selectNextWordBuilderId(VOCABULARY, progress, Date.now(), recentIds)
    prepareQuestion(nextId, progress)
  }, [practiceMode, prepareQuestion, progress, recentIds, result])

  const startPractice = useCallback(() => {
    setPracticeMode(true)
    prepareQuestion(selectWeakestWordBuilderId(VOCABULARY, progress, recentIds), progress)
  }, [prepareQuestion, progress, recentIds])

  return {
    progress,
    currentWord,
    questionLevel,
    tiles,
    placedIds,
    result,
    learnerAnswer,
    practiceMode,
    placeTile,
    removeTile,
    undo,
    clear,
    check,
    continueSession,
    startPractice,
  }
}
