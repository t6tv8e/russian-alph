import { useCallback, useEffect, useRef, useState } from 'react'
import { buildReadingChoices, isReadingChoiceCorrect, READING_DECK } from './deck'
import {
  calculateSprintPoints,
  finishReadingRound,
  firstUnseenReadingCardId,
  getReadingProgressStats,
  readReadingSprintProgress,
  recordReadingAnswer,
  READING_SPRINT_STORAGE_KEY,
  selectNextReadingCardId,
} from './progress'
import type {
  AnswerResult,
  ReadingChoice,
  ReadingSprintMode,
  ReadingSprintProgress,
} from './types'
import './reading-sprint.css'

export interface ReadingSprintGameProps {
  onExit: () => void
}

type Screen = 'setup' | 'active' | 'results'
type QuestionPhase = 'question' | 'feedback'

interface RoundStats {
  score: number
  combo: number
  attempts: number
  correct: number
}

const SPRINT_DURATION = 45_000
const FEEDBACK_DURATION = 400
const RELAXED_CARD_COUNT = 20
const CHOICE_KEYS = ['A', 'B', 'C', 'D'] as const
const EMPTY_STATS: RoundStats = { score: 0, combo: 0, attempts: 0, correct: 0 }

function accuracy(correct: number, attempts: number): number {
  return attempts === 0 ? 0 : Math.round((correct / attempts) * 100)
}

export function ReadingSprintGame({ onExit }: ReadingSprintGameProps) {
  const [progress, setProgress] = useState<ReadingSprintProgress>(() =>
    readReadingSprintProgress(READING_DECK),
  )
  const progressRef = useRef(progress)
  const [mode, setMode] = useState<ReadingSprintMode>('sprint')
  const modeRef = useRef(mode)
  const [screen, setScreen] = useState<Screen>('setup')
  const screenRef = useRef(screen)
  const [questionPhase, setQuestionPhase] = useState<QuestionPhase>('question')
  const phaseRef = useRef<QuestionPhase>('question')
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [choices, setChoices] = useState<ReadingChoice[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [stats, setStats] = useState<RoundStats>(EMPTY_STATS)
  const statsRef = useRef<RoundStats>(EMPTY_STATS)
  const [remainingMs, setRemainingMs] = useState(SPRINT_DURATION)
  const [confirmExit, setConfirmExit] = useState(false)
  const recentIdsRef = useRef<string[]>([])
  const effectiveStartRef = useRef(0)
  const hiddenAtRef = useRef<number | null>(null)
  const nextQuestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackDeadlineRef = useRef<number | null>(null)
  const feedbackRemainingRef = useRef(FEEDBACK_DURATION)
  const firstChoiceRef = useRef<HTMLButtonElement>(null)
  const startButtonRef = useRef<HTMLButtonElement>(null)
  const advanceRef = useRef<() => void>(() => undefined)
  const finishRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  const storeProgress = useCallback((update: (current: ReadingSprintProgress) => ReadingSprintProgress) => {
    setProgress((current) => {
      const next = update(current)
      progressRef.current = next
      try {
        window.localStorage.setItem(READING_SPRINT_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Learning remains usable when storage is unavailable.
      }
      return next
    })
  }, [])

  const clearNextTimeout = useCallback(() => {
    if (nextQuestionTimeoutRef.current !== null) {
      clearTimeout(nextQuestionTimeoutRef.current)
      nextQuestionTimeoutRef.current = null
    }
    feedbackDeadlineRef.current = null
  }, [])

  const finishRound = useCallback(() => {
    if (screenRef.current !== 'active') {
      return
    }
    clearNextTimeout()
    screenRef.current = 'results'
    setScreen('results')
    setConfirmExit(false)
    phaseRef.current = 'question'
    setQuestionPhase('question')
    const finalStats = statsRef.current
    storeProgress((current) => finishReadingRound(
      current,
      modeRef.current,
      finalStats.score,
      finalStats.correct,
      finalStats.attempts,
    ))
  }, [clearNextTimeout, storeProgress])

  finishRef.current = finishRound

  const getRemainingMs = useCallback(() => {
    const clock = hiddenAtRef.current ?? performance.now()
    return Math.max(0, SPRINT_DURATION - (clock - effectiveStartRef.current))
  }, [])

  const presentQuestion = useCallback((cardId: string) => {
    const card = READING_DECK.find((item) => item.id === cardId)
    if (!card) {
      finishRef.current()
      return
    }
    setCurrentId(card.id)
    setChoices(buildReadingChoices(card))
    setSelectedId(null)
    setResult(null)
    phaseRef.current = 'question'
    setQuestionPhase('question')
  }, [])

  const advanceQuestion = useCallback(() => {
    clearNextTimeout()
    if (screenRef.current !== 'active') {
      return
    }
    if (modeRef.current === 'sprint' && getRemainingMs() <= 0) {
      setRemainingMs(0)
      finishRef.current()
      return
    }
    if (modeRef.current === 'relaxed' && statsRef.current.attempts >= RELAXED_CARD_COUNT) {
      finishRef.current()
      return
    }

    const nextId = selectNextReadingCardId(
      READING_DECK,
      progressRef.current,
      Date.now(),
      recentIdsRef.current,
      modeRef.current === 'sprint',
    )
    if (!nextId) {
      finishRef.current()
      return
    }
    presentQuestion(nextId)
  }, [clearNextTimeout, getRemainingMs, presentQuestion])

  advanceRef.current = advanceQuestion

  const scheduleAdvance = useCallback((delay: number) => {
    clearNextTimeout()
    feedbackRemainingRef.current = delay
    feedbackDeadlineRef.current = performance.now() + delay
    nextQuestionTimeoutRef.current = setTimeout(() => advanceRef.current(), delay)
  }, [clearNextTimeout])

  const startRound = useCallback(() => {
    clearNextTimeout()
    const initialStats = { ...EMPTY_STATS }
    statsRef.current = initialStats
    setStats(initialStats)
    recentIdsRef.current = []
    hiddenAtRef.current = null
    feedbackRemainingRef.current = FEEDBACK_DURATION
    setConfirmExit(false)
    setRemainingMs(SPRINT_DURATION)
    effectiveStartRef.current = performance.now()
    screenRef.current = 'active'
    setScreen('active')

    const firstId = firstUnseenReadingCardId(READING_DECK, progressRef.current)
      ?? selectNextReadingCardId(READING_DECK, progressRef.current, Date.now(), [], true)
    if (firstId) {
      presentQuestion(firstId)
    }
  }, [clearNextTimeout, presentQuestion])

  const gradeChoice = useCallback((choice: ReadingChoice) => {
    if (
      screenRef.current !== 'active' ||
      phaseRef.current !== 'question' ||
      confirmExit ||
      !currentId
    ) {
      return
    }
    if (modeRef.current === 'sprint' && getRemainingMs() <= 0) {
      setRemainingMs(0)
      finishRef.current()
      return
    }

    const correct = isReadingChoiceCorrect(currentId, choice.cardId)
    const previousStats = statsRef.current
    const nextStats: RoundStats = {
      score: previousStats.score + (modeRef.current === 'sprint' && correct
        ? calculateSprintPoints(previousStats.combo)
        : 0),
      combo: correct ? previousStats.combo + 1 : 0,
      attempts: previousStats.attempts + 1,
      correct: previousStats.correct + (correct ? 1 : 0),
    }
    statsRef.current = nextStats
    setStats(nextStats)
    recentIdsRef.current = [...recentIdsRef.current, currentId].slice(-2)
    storeProgress((current) => recordReadingAnswer(current, currentId, correct))
    setSelectedId(choice.cardId)
    setResult(correct ? 'correct' : 'incorrect')
    phaseRef.current = 'feedback'
    setQuestionPhase('feedback')

    if (modeRef.current === 'sprint') {
      scheduleAdvance(FEEDBACK_DURATION)
    }
  }, [confirmExit, currentId, getRemainingMs, scheduleAdvance, storeProgress])

  useEffect(() => {
    if (screen !== 'active' || mode !== 'sprint') {
      return undefined
    }

    const updateTimer = () => {
      const remaining = getRemainingMs()
      setRemainingMs(remaining)
      if (remaining <= 0) {
        finishRef.current()
      }
    }
    updateTimer()
    const interval = window.setInterval(updateTimer, 250)
    return () => window.clearInterval(interval)
  }, [getRemainingMs, mode, screen])

  useEffect(() => {
    if (screen !== 'active' || mode !== 'sprint') {
      return undefined
    }

    const handleVisibility = () => {
      const now = performance.now()
      if (document.visibilityState === 'hidden' && hiddenAtRef.current === null) {
        hiddenAtRef.current = now
        if (nextQuestionTimeoutRef.current !== null && feedbackDeadlineRef.current !== null) {
          feedbackRemainingRef.current = Math.max(0, feedbackDeadlineRef.current - now)
          clearTimeout(nextQuestionTimeoutRef.current)
          nextQuestionTimeoutRef.current = null
        }
        return
      }

      if (document.visibilityState !== 'hidden' && hiddenAtRef.current !== null) {
        effectiveStartRef.current += now - hiddenAtRef.current
        hiddenAtRef.current = null
        if (phaseRef.current === 'feedback' && nextQuestionTimeoutRef.current === null) {
          scheduleAdvance(feedbackRemainingRef.current)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [mode, scheduleAdvance, screen])

  useEffect(() => () => clearNextTimeout(), [clearNextTimeout])

  useEffect(() => {
    if (screen === 'active' && questionPhase === 'question' && !confirmExit) {
      firstChoiceRef.current?.focus()
    }
  }, [confirmExit, currentId, questionPhase, screen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        if (screenRef.current === 'active') {
          setConfirmExit(true)
        } else {
          onExit()
        }
        return
      }

      if (screenRef.current !== 'active' || confirmExit) {
        return
      }

      const choiceIndex = CHOICE_KEYS.indexOf(event.key.toLocaleUpperCase('en') as (typeof CHOICE_KEYS)[number])
      if (phaseRef.current === 'question' && choiceIndex >= 0 && choices[choiceIndex]) {
        event.preventDefault()
        gradeChoice(choices[choiceIndex])
        return
      }

      if (
        modeRef.current === 'relaxed' &&
        phaseRef.current === 'feedback' &&
        event.key === 'Enter' &&
        !(event.target instanceof HTMLButtonElement)
      ) {
        event.preventDefault()
        advanceRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [choices, confirmExit, gradeChoice, onExit])

  const card = READING_DECK.find((item) => item.id === currentId) ?? null
  const progressStats = getReadingProgressStats(progress)

  if (screen === 'setup') {
    return (
      <section className="reading-sprint reading-sprint--setup" aria-labelledby="reading-sprint-title">
        <div className="reading-sprint__paper">
          <p className="reading-sprint__kicker">Reading · Fluency</p>
          <h1 id="reading-sprint-title">Reading Sprint</h1>
          <p className="reading-sprint__intro">Choose the Latin transliteration, not the English meaning.</p>

          <fieldset className="reading-sprint__modes">
            <legend>Choose a round</legend>
            <label>
              <input
                type="radio"
                name="reading-sprint-mode"
                value="sprint"
                checked={mode === 'sprint'}
                onChange={() => setMode('sprint')}
              />
              <span><strong>45-second sprint</strong><small>Build score with fast, accurate streaks.</small></span>
            </label>
            <label>
              <input
                type="radio"
                name="reading-sprint-mode"
                value="relaxed"
                checked={mode === 'relaxed'}
                onChange={() => setMode('relaxed')}
              />
              <span><strong>Relaxed 20-card round</strong><small>Decode without a timer.</small></span>
            </label>
          </fieldset>

          <div className="reading-sprint__bests" aria-label="Personal bests">
            <span><strong>{progress.bestSprintScore}</strong>best sprint score</span>
            <span><strong>{progress.bestRelaxedAccuracy}%</strong>best relaxed accuracy</span>
          </div>

          <div className="reading-sprint__setup-actions">
            <button ref={startButtonRef} className="reading-sprint__primary" type="button" onClick={startRound} autoFocus>
              Start
            </button>
            <button className="reading-sprint__secondary" type="button" onClick={onExit}>Exit</button>
          </div>
        </div>
      </section>
    )
  }

  if (screen === 'results') {
    const roundAccuracy = accuracy(stats.correct, stats.attempts)
    return (
      <section className="reading-sprint reading-sprint--results" aria-labelledby="reading-sprint-results-title">
        <div className="reading-sprint__paper" role="status" aria-live="polite" aria-atomic="true">
          <span className="reading-sprint__result-icon" aria-hidden="true">⚡</span>
          <p className="reading-sprint__kicker">Round complete</p>
          <h1 id="reading-sprint-results-title">Reading Sprint results</h1>
          <div className="reading-sprint__result-stats">
            {mode === 'sprint' ? <span><strong>{stats.score}</strong>score</span> : null}
            <span><strong>{stats.correct}/{stats.attempts}</strong>correct</span>
            <span><strong>{roundAccuracy}%</strong>accuracy</span>
          </div>
          <p>
            {mode === 'sprint'
              ? `Best sprint: ${progress.bestSprintScore} points at ${progress.bestSprintAccuracy}% accuracy.`
              : `Best relaxed accuracy: ${progress.bestRelaxedAccuracy}%.`}
          </p>
          <div className="reading-sprint__result-actions">
            <button className="reading-sprint__primary" type="button" onClick={startRound}>Try again</button>
            <button
              className="reading-sprint__secondary"
              type="button"
              onClick={() => {
                setMode(mode === 'sprint' ? 'relaxed' : 'sprint')
                screenRef.current = 'setup'
                setScreen('setup')
              }}
            >
              Switch mode
            </button>
            <button className="reading-sprint__secondary" type="button" onClick={onExit}>All games</button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="reading-sprint" aria-labelledby="reading-sprint-title">
      <header className="reading-sprint__header">
        <div>
          <p className="reading-sprint__kicker">Reading · Fluency</p>
          <h1 id="reading-sprint-title">Reading Sprint</h1>
        </div>
        <div className="reading-sprint__header-stats" aria-label="Reading progress">
          <span><strong>{progressStats.mastered}</strong> mastered</span>
          <span><strong>{progressStats.overallPercent}%</strong> overall</span>
        </div>
      </header>

      <div className="reading-sprint__round-bar">
        {mode === 'sprint' ? (
          <span className="reading-sprint__timer" role="timer" aria-label="Time remaining">
            <strong>{Math.ceil(remainingMs / 1000)}</strong> seconds
          </span>
        ) : (
          <span><strong>{Math.min(
            stats.attempts + (questionPhase === 'question' ? 1 : 0),
            RELAXED_CARD_COUNT,
          )}</strong> of {RELAXED_CARD_COUNT}</span>
        )}
        {mode === 'sprint' ? <span><strong>{stats.score}</strong> points</span> : null}
        <span><strong>{stats.combo}</strong> combo</span>
      </div>

      {card ? (
        <article className="reading-sprint__question-card">
          <p className="reading-sprint__legend">Choose the transliteration</p>
          <h2 className="reading-sprint__word" lang="ru">{card.russian}</h2>

          <div className="reading-sprint__choices" role="group" aria-label="Latin transliteration choices">
            {choices.map((choice, index) => {
              const isCorrect = questionPhase === 'feedback' && choice.cardId === card.id
              const isIncorrect = questionPhase === 'feedback' && choice.cardId === selectedId && choice.cardId !== card.id
              return (
                <button
                  ref={index === 0 ? firstChoiceRef : undefined}
                  className={`reading-sprint__choice${isCorrect ? ' reading-sprint__choice--correct' : ''}${isIncorrect ? ' reading-sprint__choice--incorrect' : ''}`}
                  type="button"
                  key={choice.cardId}
                  onClick={() => gradeChoice(choice)}
                  disabled={questionPhase === 'feedback' || confirmExit}
                  aria-keyshortcuts={CHOICE_KEYS[index]}
                >
                  <span className="reading-sprint__choice-key" aria-hidden="true">{CHOICE_KEYS[index]}</span>
                  {choice.label}
                  {isCorrect ? <span aria-hidden="true">✓</span> : null}
                  {isIncorrect ? <span aria-hidden="true">×</span> : null}
                </button>
              )
            })}
          </div>

          {result ? (
            <div
              className={`reading-sprint__feedback reading-sprint__feedback--${result}`}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <div>
                <strong>{result === 'correct' ? 'Correct decoding' : 'Keep decoding'}</strong>
                <p><span lang="ru">{card.russian}</span> · {card.latin} — {card.english}.</p>
                {result === 'incorrect' ? <small>This word will return soon.</small> : null}
              </div>
              {mode === 'relaxed' ? (
                <button className="reading-sprint__primary" type="button" onClick={advanceQuestion} autoFocus>
                  Continue
                </button>
              ) : <span className="reading-sprint__next-cue">Next word…</span>}
            </div>
          ) : null}
        </article>
      ) : null}

      {confirmExit ? (
        <div className="reading-sprint__confirm" role="alertdialog" aria-labelledby="reading-sprint-confirm-title" aria-modal="true">
          <div>
            <strong id="reading-sprint-confirm-title">End this round?</strong>
            <p>Your answers so far are saved, but this run will end.</p>
          </div>
          <button className="reading-sprint__danger" type="button" onClick={finishRound}>End round</button>
          <button className="reading-sprint__secondary" type="button" onClick={() => setConfirmExit(false)} autoFocus>Keep reading</button>
        </div>
      ) : null}
    </section>
  )
}
