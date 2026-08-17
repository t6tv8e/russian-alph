import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRussianSpeech } from '../../hooks/useRussianSpeech'
import { SENTENCE_BUILDER_SENTENCES } from './content'
import {
  buildSentenceTiles,
  createSentenceBuilderProgress,
  getSentenceBuilderStats,
  getSentenceQuestionMode,
  gradeSentenceTokens,
  hydrateSentenceBuilderProgress,
  recordSentenceAnswer,
  selectNextSentenceId,
  selectWeakestSentenceId,
  SENTENCE_BUILDER_STORAGE_KEY,
  type SentenceBuilderProgress,
  type SentenceTile,
} from './logic'
import './sentence-builder.css'

export interface SentenceBuilderGameProps {
  onExit: () => void
}

type AnswerResult = 'correct' | 'incorrect' | null

interface StoredSession {
  currentId: string | null
  recentIds: string[]
  practiceMode: boolean
  placedIds: string[]
  result: AnswerResult
  questionNumber: number
  questionLevel: number
}

interface InitialState {
  progress: SentenceBuilderProgress
  session: StoredSession
}

const SENTENCES_BY_ID = new Map(SENTENCE_BUILDER_SENTENCES.map((sentence) => [sentence.id, sentence]))

function seededRandom(questionNumber: number, id: string): () => number {
  let seed = questionNumber + 1
  for (const character of id) seed = (seed * 31 + character.charCodeAt(0)) >>> 0
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0x1_0000_0000
  }
}

function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<StoredSession>
  return (session.currentId === null || (typeof session.currentId === 'string' && SENTENCES_BY_ID.has(session.currentId))) &&
    Array.isArray(session.recentIds) && session.recentIds.every((id) => typeof id === 'string' && SENTENCES_BY_ID.has(id)) &&
    typeof session.practiceMode === 'boolean' && Array.isArray(session.placedIds) && session.placedIds.every((id) => typeof id === 'string') &&
    (session.result === null || session.result === 'correct' || session.result === 'incorrect') &&
    Number.isInteger(session.questionNumber) && (session.questionNumber ?? -1) >= 0 &&
    Number.isInteger(session.questionLevel) && (session.questionLevel ?? -1) >= 0 && (session.questionLevel ?? 6) <= 5
}

function readInitialState(): InitialState {
  const fresh = createSentenceBuilderProgress(SENTENCE_BUILDER_SENTENCES)
  if (typeof window === 'undefined') {
    return { progress: fresh, session: { currentId: SENTENCE_BUILDER_SENTENCES[0]?.id ?? null, recentIds: [], practiceMode: false, placedIds: [], result: null, questionNumber: 0, questionLevel: 0 } }
  }
  try {
    const raw = window.localStorage.getItem(SENTENCE_BUILDER_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    const progress = hydrateSentenceBuilderProgress(parsed, SENTENCE_BUILDER_SENTENCES)
    const candidate = parsed && typeof parsed === 'object' && (parsed as { version?: unknown }).version === 1
      ? (parsed as { session?: unknown }).session
      : undefined
    if (isStoredSession(candidate)) return { progress, session: candidate }
    const currentId = selectNextSentenceId(SENTENCE_BUILDER_SENTENCES, progress)
    return {
      progress,
      session: { currentId, recentIds: [], practiceMode: false, placedIds: [], result: null, questionNumber: 0, questionLevel: currentId ? progress.items[currentId].level : 0 },
    }
  } catch {
    return { progress: fresh, session: { currentId: SENTENCE_BUILDER_SENTENCES[0]?.id ?? null, recentIds: [], practiceMode: false, placedIds: [], result: null, questionNumber: 0, questionLevel: 0 } }
  }
}

function storeState(progress: SentenceBuilderProgress, session: StoredSession): void {
  try {
    window.localStorage.setItem(SENTENCE_BUILDER_STORAGE_KEY, JSON.stringify({ ...progress, session }))
  } catch {
    // Sentence practice remains usable when storage is blocked or full.
  }
}

export function SentenceBuilderGame({ onExit }: SentenceBuilderGameProps) {
  const [initial] = useState(readInitialState)
  const [progress, setProgress] = useState(initial.progress)
  const [session, setSession] = useState(initial.session)
  const speech = useRussianSpeech()
  const firstTileRef = useRef<HTMLButtonElement>(null)
  const completionRef = useRef<HTMLHeadingElement>(null)

  const sentence = session.currentId ? SENTENCES_BY_ID.get(session.currentId) ?? null : null
  const level = session.questionLevel
  const questionMode = getSentenceQuestionMode(level)
  const tiles = useMemo(
    () => sentence ? buildSentenceTiles(sentence, level, seededRandom(session.questionNumber, sentence.id)) : [],
    [level, sentence, session.questionNumber],
  )
  const tileById = useMemo(() => new Map(tiles.map((tile) => [tile.id, tile])), [tiles])
  const placed = session.placedIds.map((id) => tileById.get(id)).filter((tile): tile is SentenceTile => Boolean(tile))
  const stats = getSentenceBuilderStats(progress)
  const revealed = session.result !== null
  const answerComplete = Boolean(sentence && placed.length === sentence.tokens.length)

  useEffect(() => { storeState(progress, session) }, [progress, session])

  useEffect(() => {
    if (sentence && !revealed) firstTileRef.current?.focus()
    if (!sentence) completionRef.current?.focus()
  }, [revealed, sentence, session.questionNumber])

  const updatePlaced = useCallback((placedIds: string[]) => {
    if (!revealed) setSession((current) => ({ ...current, placedIds }))
  }, [revealed])

  const addTile = useCallback((id: string) => {
    if (!sentence || revealed || session.placedIds.includes(id) || session.placedIds.length >= sentence.tokens.length) return
    updatePlaced([...session.placedIds, id])
  }, [revealed, sentence, session.placedIds, updatePlaced])

  const removeTile = useCallback((id: string) => {
    updatePlaced(session.placedIds.filter((placedId) => placedId !== id))
  }, [session.placedIds, updatePlaced])

  const undo = useCallback(() => updatePlaced(session.placedIds.slice(0, -1)), [session.placedIds, updatePlaced])
  const clear = useCallback(() => updatePlaced([]), [updatePlaced])

  const check = useCallback(() => {
    if (!sentence || revealed || session.placedIds.length !== sentence.tokens.length) return
    const values = session.placedIds.map((id) => tileById.get(id)?.value ?? '')
    const correct = gradeSentenceTokens(sentence, values)
    const nextProgress = recordSentenceAnswer(progress, sentence.id, correct)
    const nextSession = { ...session, result: correct ? 'correct' as const : 'incorrect' as const }
    storeState(nextProgress, nextSession)
    setProgress(nextProgress)
    setSession(nextSession)
  }, [progress, revealed, sentence, session, tileById])

  const continueSession = useCallback(() => {
    if (!sentence || !revealed) return
    const recentIds = [...session.recentIds, sentence.id].slice(-6)
    const nextId = selectNextSentenceId(SENTENCE_BUILDER_SENTENCES, progress, Date.now(), recentIds) ??
      (session.practiceMode ? selectWeakestSentenceId(SENTENCE_BUILDER_SENTENCES, progress, recentIds) : null)
    setSession({ ...session, currentId: nextId, recentIds, placedIds: [], result: null, questionNumber: session.questionNumber + 1, questionLevel: nextId ? progress.items[nextId].level : 0 })
  }, [progress, revealed, sentence, session])

  const startPractice = useCallback(() => {
    setSession((current) => {
      const currentId = selectWeakestSentenceId(SENTENCE_BUILDER_SENTENCES, progress, current.recentIds)
      return { ...current, currentId, practiceMode: true, placedIds: [], result: null, questionNumber: current.questionNumber + 1, questionLevel: currentId ? progress.items[currentId].level : 0 }
    })
  }, [progress])

  const endPractice = useCallback(() => {
    setSession((current) => ({ ...current, currentId: null, practiceMode: false, placedIds: [], result: null }))
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onExit()
      } else if (event.key === 'Backspace' && sentence && !revealed) {
        event.preventDefault()
        undo()
      } else if (event.key === 'Enter' && sentence && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        if (revealed) continueSession()
        else if (answerComplete) check()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [answerComplete, check, continueSession, onExit, revealed, sentence, undo])

  if (!sentence) {
    return (
      <section className="sentence-builder sentence-builder--complete" aria-labelledby="sentence-builder-title">
        <div className="sentence-builder__card sentence-builder__completion">
          <h1 id="sentence-builder-title">Sentence Builder</h1>
          <h2 ref={completionRef} tabIndex={-1}>Scheduled round complete</h2>
          <p>You cleared every new or currently due sentence.</p>
          <div className="sentence-builder__summary" aria-label="Sentence progress summary">
            <span><strong>{stats.mastered}</strong> mastered</span>
            <span><strong>{stats.levelPercent}%</strong> overall level</span>
          </div>
          <div className="sentence-builder__actions">
            <button className="sentence-builder__primary" type="button" onClick={startPractice} autoFocus>Practice weakest items</button>
            <button className="sentence-builder__secondary" type="button" onClick={onExit}>All games</button>
          </div>
        </div>
      </section>
    )
  }

  const learnerText = placed.map((tile) => tile.value).join(' ')
  const speechId = `sentence-builder-${sentence.id}`

  return (
    <section className="sentence-builder" aria-labelledby="sentence-builder-title">
      <header className="sentence-builder__header">
        <div>
          <p className="sentence-builder__kicker">Sentences · Word order</p>
          <h1 id="sentence-builder-title">Sentence Builder</h1>
        </div>
        <div className="sentence-builder__stats" aria-label="Progress">
          <span><strong>{stats.mastered}</strong> mastered</span>
          <span><strong>{stats.levelPercent}%</strong> overall level</span>
        </div>
        <button className="sentence-builder__exit" type="button" onClick={onExit} aria-keyshortcuts="Escape">Exit</button>
      </header>

      {session.practiceMode ? <div className="sentence-builder__practice"><span>Weakest-sentence practice</span><button type="button" onClick={endPractice}>Finish practice</button></div> : null}

      <article className="sentence-builder__card">
        <div className="sentence-builder__prompt">
          <p>Build this sentence in Russian:</p>
          <h2>{sentence.english}</h2>
          {questionMode.showTransliteration ? <p className="sentence-builder__scaffold">Sounds like: {sentence.latin}</p> : null}
        </div>

        <div className="sentence-builder__answer" aria-label="Your Russian sentence">
          {placed.map((tile) => (
            <button key={tile.id} type="button" lang="ru" onClick={() => removeTile(tile.id)} disabled={revealed} aria-label={`Remove ${tile.value} from answer`}>{tile.value}</button>
          ))}
          {Array.from({ length: sentence.tokens.length - placed.length }, (_, index) => <span className="sentence-builder__slot" aria-hidden="true" key={`slot-${index}`} />)}
          <span className="sentence-builder__period" lang="ru" aria-label="Fixed final period">.</span>
        </div>

        <div className="sentence-builder__bank" role="group" aria-label="Russian word tiles">
          {tiles.map((tile, index) => {
            const used = session.placedIds.includes(tile.id)
            return <button ref={index === 0 ? firstTileRef : undefined} key={tile.id} type="button" lang="ru" onClick={() => addTile(tile.id)} disabled={revealed || used || session.placedIds.length >= sentence.tokens.length} aria-label={`Add ${tile.value} to answer`}>{tile.value}</button>
          })}
        </div>

        <div className="sentence-builder__controls">
          <button type="button" onClick={undo} disabled={revealed || placed.length === 0} aria-keyshortcuts="Backspace">Undo</button>
          <button type="button" onClick={clear} disabled={revealed || placed.length === 0}>Clear</button>
          <button className="sentence-builder__primary" type="button" onClick={check} disabled={revealed || !answerComplete}>Check</button>
        </div>

        {revealed ? (
          <div className={`sentence-builder__feedback sentence-builder__feedback--${session.result}`} role="status" aria-live="polite" aria-atomic="true">
            {session.result === 'correct' ? (
              <p><strong lang="ru">{sentence.russian}</strong> · {sentence.latin} means {sentence.english}</p>
            ) : (
              <div>
                <p>Your answer: <span lang="ru">{learnerText || '—'}.</span></p>
                <p>Russian word order for this prompt is: <strong lang="ru">{sentence.russian}</strong></p>
                <p>{sentence.latin} · {sentence.english} This sentence will return soon.</p>
              </div>
            )}
            <div className="sentence-builder__feedback-actions">
              <button className="sentence-builder__audio" type="button" disabled={!speech.canSpeak} title={speech.unavailableReason ?? undefined} onClick={() => speech.speak(sentence.russian, speechId)} aria-pressed={speech.speakingId === speechId}>Play sentence</button>
              <button className="sentence-builder__primary" type="button" onClick={continueSession} autoFocus>Continue</button>
            </div>
          </div>
        ) : null}
      </article>
    </section>
  )
}
