import { useEffect, useMemo, useRef } from 'react'
import { VOCABULARY } from '../../data/vocabulary'
import { useRussianSpeech } from '../../hooks/useRussianSpeech'
import { getWordBuilderMode, getWordBuilderStats } from './wordBuilder'
import { useWordBuilderSession } from './useWordBuilderSession'
import './word-builder.css'

export interface WordBuilderGameProps {
  onExit: () => void
}

export function WordBuilderGame({ onExit }: WordBuilderGameProps) {
  const session = useWordBuilderSession()
  const speech = useRussianSpeech()
  const firstBankTileRef = useRef<HTMLButtonElement>(null)
  const mode = getWordBuilderMode(session.questionLevel)
  const stats = getWordBuilderStats(session.progress)
  const placedTiles = useMemo(() => session.placedIds.map((id) =>
    session.tiles.find((tile) => tile.id === id)).filter((tile) => tile !== undefined),
  [session.placedIds, session.tiles])

  useEffect(() => {
    if (session.currentWord && !session.result) firstBankTileRef.current?.focus()
  }, [session.currentWord, session.result])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onExit()
        return
      }
      if (event.key === 'Backspace' && session.currentWord && !session.result) {
        event.preventDefault()
        session.undo()
        return
      }
      if (event.key !== 'Enter' || event.target instanceof HTMLButtonElement) return
      if (session.result) {
        event.preventDefault()
        session.continueSession()
      } else if (session.currentWord && session.placedIds.length === session.currentWord.russian.length) {
        event.preventDefault()
        session.check()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExit, session])

  const playAnswer = () => {
    if (session.currentWord) speech.speak(session.currentWord.russian, `word-builder-${session.currentWord.id}`)
  }

  if (!session.currentWord) {
    const accuracy = stats.attempts > 0 ? Math.round(stats.correctAttempts / stats.attempts * 100) : 0
    return (
      <section className="word-builder word-builder--complete" aria-labelledby="word-builder-title">
        <header className="word-builder__header">
          <div>
            <p className="word-builder__kicker">Words · Spelling</p>
            <h1 id="word-builder-title">Word Builder</h1>
          </div>
          <button className="word-builder__exit" type="button" onClick={onExit} aria-keyshortcuts="Escape">
            Exit
          </button>
        </header>
        <div className="word-builder__complete-card" role="status" aria-live="polite" aria-atomic="true">
          <span className="word-builder__complete-mark" aria-hidden="true">✓</span>
          <h2>Spelling round complete</h2>
          <p>No unseen or currently due words remain.</p>
          <div className="word-builder__complete-stats" aria-label="Word Builder progress summary">
            <div><strong>{stats.mastered}/{VOCABULARY.length}</strong><span>words mastered</span></div>
            <div><strong>{stats.overall}%</strong><span>overall level</span></div>
            <div><strong>{accuracy}%</strong><span>accuracy</span></div>
          </div>
          <div className="word-builder__complete-actions">
            <button className="word-builder__primary" type="button" onClick={session.startPractice} autoFocus>
              Practice weakest items
            </button>
            <button className="word-builder__secondary" type="button" onClick={onExit}>All games</button>
          </div>
        </div>
      </section>
    )
  }

  const answerComplete = session.placedIds.length === session.currentWord.russian.length
  const speakingId = `word-builder-${session.currentWord.id}`

  return (
    <section className="word-builder" aria-labelledby="word-builder-title">
      <header className="word-builder__header">
        <div>
          <p className="word-builder__kicker">Words · Spelling</p>
          <h1 id="word-builder-title">Word Builder</h1>
        </div>
        <div className="word-builder__header-actions">
          <span aria-label={`${stats.mastered} of ${VOCABULARY.length} mastered, ${stats.overall}% overall level`}>
            {stats.mastered}/{VOCABULARY.length} mastered · {stats.overall}%
          </span>
          <button className="word-builder__exit" type="button" onClick={onExit} aria-keyshortcuts="Escape">
            Exit
          </button>
        </div>
      </header>

      <article className="word-builder__card">
        <div className="word-builder__prompt">
          <p>Build the Russian word for:</p>
          <h2>{session.currentWord.english}</h2>
          {mode.showTransliteration ? <p className="word-builder__scaffold">Sounds like: {session.currentWord.latin}</p> : null}
        </div>

        <div className="word-builder__work-area">
          <div className="word-builder__slots" aria-label={`Your answer, ${session.currentWord.russian.length} letters`}>
            {Array.from({ length: session.currentWord.russian.length }, (_, index) => {
              const tile = placedTiles[index]
              return tile ? (
                <button
                  className="word-builder__tile word-builder__tile--placed"
                  type="button"
                  key={tile.id}
                  lang="ru"
                  onClick={() => session.removeTile(tile.id)}
                  disabled={Boolean(session.result)}
                  aria-label={`Remove ${tile.value} from position ${index + 1}`}
                >
                  {tile.value}
                </button>
              ) : <span className="word-builder__slot" key={`slot-${index}`} aria-hidden="true" />
            })}
          </div>

          <div className="word-builder__bank" role="group" aria-label="Cyrillic letter tiles">
            {session.tiles.map((tile, index) => {
              const placed = session.placedIds.includes(tile.id)
              return (
                <button
                  className="word-builder__tile"
                  type="button"
                  key={tile.id}
                  lang="ru"
                  ref={index === 0 ? firstBankTileRef : undefined}
                  onClick={() => session.placeTile(tile.id)}
                  disabled={Boolean(session.result) || placed || answerComplete}
                  aria-label={`Add ${tile.value}`}
                  aria-pressed={placed}
                >
                  {tile.value}
                </button>
              )
            })}
          </div>

          <div className="word-builder__controls">
            <button className="word-builder__secondary" type="button" onClick={session.undo} disabled={Boolean(session.result) || session.placedIds.length === 0} aria-keyshortcuts="Backspace">
              Undo
            </button>
            <button className="word-builder__secondary" type="button" onClick={session.clear} disabled={Boolean(session.result) || session.placedIds.length === 0}>
              Clear
            </button>
            <button className="word-builder__primary" type="button" onClick={session.check} disabled={Boolean(session.result) || !answerComplete} aria-keyshortcuts="Enter">
              Check
            </button>
          </div>

          {session.result ? (
            <div className={`word-builder__feedback word-builder__feedback--${session.result}`} role="status" aria-live="polite" aria-atomic="true">
              <div className="word-builder__feedback-copy">
                {session.result === 'correct' ? (
                  <p><strong lang="ru">{session.currentWord.russian}</strong> · {session.currentWord.latin} means {session.currentWord.english}.</p>
                ) : (
                  <p>
                    Your answer: <strong lang="ru">{session.learnerAnswer}</strong>. The correct answer is{' '}
                    <strong lang="ru">{session.currentWord.russian}</strong> · {session.currentWord.latin}, meaning {session.currentWord.english}. This word will return soon.
                  </p>
                )}
              </div>
              <button
                className="word-builder__audio"
                type="button"
                onClick={playAnswer}
                disabled={!speech.canSpeak}
                aria-label="Play correct Russian word"
                title={speech.unavailableReason ?? undefined}
              >
                {speech.speakingId === speakingId ? 'Playing…' : '▶ Listen'}
              </button>
              <button className="word-builder__primary" type="button" onClick={session.continueSession} autoFocus>
                Continue
              </button>
            </div>
          ) : null}
        </div>
      </article>
    </section>
  )
}
