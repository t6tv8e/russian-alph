import { useCallback, useEffect, useMemo, useState } from 'react'
import { VOCABULARY, VOCABULARY_BY_ID } from '../../data/vocabulary'
import {
  buildWordDictationTiles,
  createWordDictationProgress,
  gradeWordDictation,
  hydrateWordDictationProgress,
  recordWordDictationAnswer,
  selectNextWordDictationId,
  selectWeakestWordDictationId,
  WORD_DICTATION_STORAGE_KEY,
} from './logic'

function readProgress() {
  if (typeof window === 'undefined') return createWordDictationProgress()
  try {
    const stored = window.localStorage.getItem(WORD_DICTATION_STORAGE_KEY)
    return hydrateWordDictationProgress(stored ? JSON.parse(stored) : null)
  } catch {
    return createWordDictationProgress()
  }
}

export function useWordDictationSession() {
  const [progress, setProgress] = useState(readProgress)
  const session = progress.session
  const currentWord = session.currentId ? VOCABULARY_BY_ID.get(session.currentId) ?? null : null
  const currentItem = currentWord ? progress.items[currentWord.id] : null
  const tiles = useMemo(
    () => currentWord
      ? buildWordDictationTiles(currentWord, VOCABULARY, session.questionLevel)
      : [],
    [currentWord, session.questionLevel],
  )
  const validTileIds = useMemo(() => new Set(tiles.map((tile) => tile.id)), [tiles])
  const placedTileIds = session.placedTileIds.filter((id) => validTileIds.has(id))

  useEffect(() => {
    try {
      window.localStorage.setItem(WORD_DICTATION_STORAGE_KEY, JSON.stringify(progress))
    } catch {
      // Dictation remains playable when storage is blocked or full.
    }
  }, [progress])

  const patchSession = useCallback((patch: Partial<typeof session>) => {
    setProgress((current) => ({
      ...current,
      session: { ...current.session, ...patch },
    }))
  }, [])

  const markPlayed = useCallback(() => {
    if (!currentWord || session.phase !== 'question') return
    patchSession({ hasPlayed: true })
  }, [currentWord, patchSession, session.phase])

  const placeTile = useCallback((tileId: string) => {
    if (!currentWord || session.phase !== 'question' || !session.hasPlayed ||
      placedTileIds.length >= Array.from(currentWord.russian).length ||
      placedTileIds.includes(tileId) || !validTileIds.has(tileId)) return
    patchSession({ placedTileIds: [...placedTileIds, tileId] })
  }, [currentWord, patchSession, placedTileIds, session.hasPlayed, session.phase, validTileIds])

  const removeTile = useCallback((tileId: string) => {
    if (session.phase !== 'question' || !session.hasPlayed) return
    patchSession({ placedTileIds: placedTileIds.filter((id) => id !== tileId) })
  }, [patchSession, placedTileIds, session.hasPlayed, session.phase])

  const undo = useCallback(() => {
    if (session.phase !== 'question' || !session.hasPlayed || placedTileIds.length === 0) return
    patchSession({ placedTileIds: placedTileIds.slice(0, -1) })
  }, [patchSession, placedTileIds, session.hasPlayed, session.phase])

  const clear = useCallback(() => {
    if (session.phase !== 'question' || !session.hasPlayed || placedTileIds.length === 0) return
    patchSession({ placedTileIds: [] })
  }, [patchSession, placedTileIds, session.hasPlayed, session.phase])

  const grade = useCallback(() => {
    if (!currentWord || session.phase !== 'question' || !session.hasPlayed ||
      placedTileIds.length !== Array.from(currentWord.russian).length) return
    const correct = gradeWordDictation(tiles, placedTileIds, currentWord.russian)
    const byId = new Map(tiles.map((tile) => [tile.id, tile]))
    const learnerAnswer = placedTileIds.map((id) => byId.get(id)?.value ?? '').join('')
    setProgress((current) => {
      if (current.session.phase !== 'question') return current
      const recorded = recordWordDictationAnswer(current, currentWord.id, correct)
      return {
        ...recorded,
        session: {
          ...recorded.session,
          phase: 'feedback',
          result: correct ? 'correct' : 'incorrect',
          learnerAnswer,
        },
      }
    })
  }, [currentWord, placedTileIds, session.hasPlayed, session.phase, tiles])

  const prepareQuestion = useCallback((wordId: string | null, practiceMode: boolean, recentIds: string[]) => {
    setProgress((current) => ({
      ...current,
      session: {
        currentId: wordId,
        recentIds,
        practiceMode,
        questionLevel: wordId ? current.items[wordId]?.level ?? 0 : 0,
        placedTileIds: [],
        hasPlayed: false,
        phase: 'question',
        result: null,
        learnerAnswer: '',
      },
    }))
  }, [])

  const continueSession = useCallback(() => {
    if (!currentWord || session.phase !== 'feedback') return
    const recentIds = [...session.recentIds, currentWord.id].slice(-2)
    const nextId = session.practiceMode
      ? selectWeakestWordDictationId(VOCABULARY, progress, recentIds)
      : selectNextWordDictationId(VOCABULARY, progress, Date.now(), recentIds)
    prepareQuestion(nextId, session.practiceMode, recentIds)
  }, [currentWord, prepareQuestion, progress, session.phase, session.practiceMode, session.recentIds])

  const startPractice = useCallback(() => {
    const nextId = selectWeakestWordDictationId(VOCABULARY, progress, session.recentIds)
    prepareQuestion(nextId, true, session.recentIds)
  }, [prepareQuestion, progress, session.recentIds])

  return {
    progress,
    session,
    currentWord,
    currentItem,
    tiles,
    placedTileIds,
    markPlayed,
    placeTile,
    removeTile,
    undo,
    clear,
    grade,
    continueSession,
    startPractice,
  }
}
