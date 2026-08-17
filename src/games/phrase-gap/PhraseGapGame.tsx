import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useRussianSpeech } from '../../hooks/useRussianSpeech'
import { PHRASE_GAPS } from './content'
import {
  buildPhraseGapChoices,
  createSeededRandom,
  getPhraseGapMode,
  isTypedGapCorrect,
  type PhraseGapMode,
} from './logic'
import {
  getPhraseGapStats,
  recordPhraseGapAnswer,
  selectNextPhraseGapId,
  selectWeakestPhraseGapId,
  type PhraseGapProgress,
  type PhraseGapResult,
} from './progress'
import { readPhraseGapProgress, writePhraseGapProgress } from './storage'
import './phrase-gap.css'

const CHOICE_KEYS = ['A', 'B', 'C', 'D'] as const
const ITEMS_BY_ID = new Map(PHRASE_GAPS.map((item) => [item.id, item]))

export interface PhraseGapGameProps {
  onExit: () => void
}

interface AnswerState {
  result: PhraseGapResult
  selectedChoice: string | null
  typedAnswer: string
}

export function PhraseGapGame({ onExit }: PhraseGapGameProps) {
  const [progress, setProgress] = useState<PhraseGapProgress>(readPhraseGapProgress)
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [currentId, setCurrentId] = useState<string | null>(() =>
    selectNextPhraseGapId(PHRASE_GAPS, progress),
  )
  const [questionMode, setQuestionMode] = useState<PhraseGapMode>(() => {
    const id = selectNextPhraseGapId(PHRASE_GAPS, progress)
    return id ? getPhraseGapMode(progress.items[id].level) : 'choice'
  })
  const [questionNumber, setQuestionNumber] = useState(0)
  const [answerState, setAnswerState] = useState<AnswerState | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [practiceMode, setPracticeMode] = useState(false)
  const firstChoiceRef = useRef<HTMLButtonElement>(null)
  const typedInputRef = useRef<HTMLInputElement>(null)
  const completionHeadingRef = useRef<HTMLHeadingElement>(null)
  const speech = useRussianSpeech()

  const currentItem = currentId ? ITEMS_BY_ID.get(currentId) ?? null : null
  const choices = useMemo(
    () => currentItem && questionMode === 'choice'
      ? buildPhraseGapChoices(
          currentItem,
          createSeededRandom(`${currentItem.id}-${progress.items[currentItem.id].attempts}-${questionNumber}`),
        )
      : [],
    // Choice order is intentionally frozen for the full question and its feedback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentItem, questionMode, questionNumber],
  )
  const stats = getPhraseGapStats(progress)

  useEffect(() => {
    writePhraseGapProgress(progress)
  }, [progress])

  useEffect(() => {
    if (!currentItem) completionHeadingRef.current?.focus()
    else if (!answerState) {
      if (questionMode === 'choice') firstChoiceRef.current?.focus()
      else typedInputRef.current?.focus()
    }
  }, [answerState, currentItem, questionMode, questionNumber])

  const prepareQuestion = useCallback((itemId: string | null, source: PhraseGapProgress) => {
    setCurrentId(itemId)
    setQuestionMode(itemId ? getPhraseGapMode(source.items[itemId].level) : 'choice')
    setAnswerState(null)
    setTypedAnswer('')
    setQuestionNumber((number) => number + 1)
  }, [])

  const grade = useCallback((submitted: string, selectedChoice: string | null) => {
    if (!currentItem || answerState) return
    const correct = questionMode === 'choice'
      ? selectedChoice === currentItem.answer
      : isTypedGapCorrect(submitted, currentItem)
    const nextProgress = recordPhraseGapAnswer(progress, currentItem.id, correct)
    writePhraseGapProgress(nextProgress)
    setProgress(nextProgress)
    setAnswerState({
      result: correct ? 'correct' : 'incorrect',
      selectedChoice,
      typedAnswer: submitted,
    })
  }, [answerState, currentItem, progress, questionMode])

  const continueSession = useCallback(() => {
    if (!currentItem || !answerState) return
    const nextRecent = [...recentIds, currentItem.id].slice(-6)
    setRecentIds(nextRecent)
    const scheduled = selectNextPhraseGapId(PHRASE_GAPS, progress, Date.now(), nextRecent)
    const nextId = scheduled ?? (practiceMode
      ? selectWeakestPhraseGapId(PHRASE_GAPS, progress, nextRecent)
      : null)
    prepareQuestion(nextId, progress)
  }, [answerState, currentItem, practiceMode, prepareQuestion, progress, recentIds])

  const startPractice = useCallback(() => {
    setPracticeMode(true)
    prepareQuestion(selectWeakestPhraseGapId(PHRASE_GAPS, progress, recentIds), progress)
  }, [prepareQuestion, progress, recentIds])

  const endPractice = useCallback(() => {
    setPracticeMode(false)
    prepareQuestion(selectNextPhraseGapId(PHRASE_GAPS, progress, Date.now(), recentIds), progress)
  }, [prepareQuestion, progress, recentIds])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onExit()
        return
      }
      if (!currentItem) return
      if (answerState) {
        if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
          event.preventDefault()
          continueSession()
        }
        return
      }
      if (questionMode === 'choice') {
        const index = CHOICE_KEYS.indexOf(event.key.toUpperCase() as typeof CHOICE_KEYS[number])
        if (index >= 0) {
          event.preventDefault()
          const choice = choices[index]
          if (choice) grade(choice.text, choice.text)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [answerState, choices, continueSession, currentItem, grade, onExit, questionMode])

  if (!currentItem) {
    return (
      <section className="phrase-gap phrase-gap--complete" aria-labelledby="phrase-gap-complete-title">
        <article className="phrase-gap__complete-card" role="status" aria-live="polite" aria-atomic="true">
          <span className="phrase-gap__complete-icon" aria-hidden="true">✓</span>
          <p className="phrase-gap__eyebrow">Scheduled round complete</p>
          <h1 id="phrase-gap-complete-title" ref={completionHeadingRef} tabIndex={-1}>Phrase Gap complete</h1>
          <p>You cleared every new or currently due phrase.</p>
          <div className="phrase-gap__complete-stats" aria-label="Phrase Gap progress summary">
            <div><strong>{stats.attempted}/24</strong><span>gaps practised</span></div>
            <div><strong>{stats.accuracy}%</strong><span>accuracy</span></div>
            <div><strong>{stats.mastered}</strong><span>mastered</span></div>
          </div>
          <div className="phrase-gap__actions">
            <button className="phrase-gap__primary" type="button" onClick={startPractice}>Practice weakest items</button>
            <button className="phrase-gap__secondary" type="button" onClick={onExit}>All games</button>
          </div>
        </article>
      </section>
    )
  }

  const revealed = answerState !== null
  const playSentence = () => speech.speak(currentItem.completedRussian, `phrase-gap-${currentItem.id}`)

  return (
    <section className="phrase-gap" aria-labelledby="phrase-gap-title">
      <header className="phrase-gap__header">
        <button className="phrase-gap__secondary phrase-gap__exit" type="button" onClick={onExit} aria-keyshortcuts="Escape">← Exit</button>
        <div className="phrase-gap__title-group">
          <p className="phrase-gap__eyebrow">Phrases · Context</p>
          <h1 id="phrase-gap-title">Phrase Gap</h1>
        </div>
        {practiceMode ? (
          <button className="phrase-gap__secondary phrase-gap__finish" type="button" onClick={endPractice}>Finish practice</button>
        ) : (
          <div className="phrase-gap__header-stat"><strong>{stats.mastered}/24</strong><span>mastered</span></div>
        )}
      </header>

      <div className="phrase-gap__progress-row">
        <span>Overall level</span><strong>{stats.levelPercent}%</strong>
        <div role="progressbar" aria-label="Overall Phrase Gap level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.levelPercent}>
          <span style={{ width: `${stats.levelPercent}%` }} />
        </div>
      </div>

      <article className="phrase-gap__card">
        <div className="phrase-gap__prompt">
          <p className="phrase-gap__mode">{questionMode === 'choice' ? 'Choose the missing word' : 'Type the missing word'}</p>
          <h2 id="phrase-gap-question">Complete the Russian phrase</h2>
          <p className="phrase-gap__sentence" lang="ru">
            {currentItem.before}<span className="phrase-gap__blank" aria-label="missing word">…</span>{currentItem.after}
          </p>
          <p className="phrase-gap__english">{currentItem.english}</p>
        </div>

        {questionMode === 'choice' ? (
          <fieldset className="phrase-gap__choices" aria-labelledby="phrase-gap-question">
            <legend className="phrase-gap__sr-only">Choose one Russian word</legend>
            <div className="phrase-gap__choice-grid">
              {choices.map((choice, index) => {
                const correct = revealed && choice.correct
                const incorrect = revealed && choice.text === answerState.selectedChoice && !choice.correct
                return (
                  <button
                    ref={index === 0 ? firstChoiceRef : undefined}
                    className={`phrase-gap__choice${correct ? ' phrase-gap__choice--correct' : ''}${incorrect ? ' phrase-gap__choice--incorrect' : ''}`}
                    type="button"
                    key={choice.id}
                    onClick={() => grade(choice.text, choice.text)}
                    disabled={revealed}
                    aria-keyshortcuts={CHOICE_KEYS[index]}
                  >
                    <span className="phrase-gap__choice-key" aria-hidden="true">{CHOICE_KEYS[index]}</span>
                    <span lang="ru">{choice.text}</span>
                  </button>
                )
              })}
            </div>
            <p className="phrase-gap__help">Choose a button or use A–D.</p>
          </fieldset>
        ) : (
          <form className="phrase-gap__typed" onSubmit={(event: FormEvent) => { event.preventDefault(); grade(typedAnswer, null) }} aria-labelledby="phrase-gap-question">
            <label htmlFor="phrase-gap-answer">Missing word in Cyrillic or Latin</label>
            <div>
              <input
                ref={typedInputRef}
                id="phrase-gap-answer"
                value={typedAnswer}
                onChange={(event) => setTypedAnswer(event.target.value)}
                disabled={revealed}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <button className="phrase-gap__primary" type="submit" disabled={revealed || !typedAnswer.trim()}>Check</button>
            </div>
          </form>
        )}

        {answerState ? (
          <section className={`phrase-gap__feedback phrase-gap__feedback--${answerState.result}`} role="status" aria-live="polite" aria-atomic="true">
            <div className="phrase-gap__feedback-copy">
              <strong>{answerState.result === 'correct' ? 'Correct' : 'Not quite'}</strong>
              {answerState.result === 'correct' ? (
                <p><span lang="ru">{currentItem.completedRussian}</span> — {currentItem.english} The missing word is transliterated <b>{currentItem.latinAnswer}</b>.</p>
              ) : questionMode === 'typed' ? (
                <p>The missing word is <b lang="ru">{currentItem.answer}</b> ({currentItem.latinAnswer}). <span lang="ru">{currentItem.completedRussian}</span> — {currentItem.english} It will return soon.</p>
              ) : (
                <p>The complete answer is <b lang="ru">{currentItem.completedRussian}</b> — {currentItem.english} It will return soon.</p>
              )}
            </div>
            <div className="phrase-gap__feedback-actions">
              <button className="phrase-gap__audio" type="button" onClick={playSentence} disabled={!speech.canSpeak} aria-label="Play completed Russian sentence">🔊 Play sentence</button>
              <button className="phrase-gap__primary" type="button" onClick={continueSession} autoFocus>Continue →</button>
            </div>
          </section>
        ) : null}
      </article>
      <p className="phrase-gap__note">Audio appears after grading so the missing word stays hidden.</p>
    </section>
  )
}
