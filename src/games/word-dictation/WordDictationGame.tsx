import { useCallback, useEffect, useRef } from 'react'
import { VOCABULARY } from '../../data/vocabulary'
import { useRussianSpeech } from '../../hooks/useRussianSpeech'
import {
  getWordDictationStats,
  showsTransliteration,
} from './logic'
import { useWordDictationSession } from './useWordDictationSession'
import './word-dictation.css'

export interface WordDictationGameProps {
  onExit: () => void
}

export function WordDictationGame({ onExit }: WordDictationGameProps) {
  const dictation = useWordDictationSession()
  const speech = useRussianSpeech()
  const playRef = useRef<HTMLButtonElement>(null)
  const practiceRef = useRef<HTMLButtonElement>(null)
  const word = dictation.currentWord
  const feedback = dictation.session.phase === 'feedback'
  const answerLength = word ? Array.from(word.russian).length : 0
  const answerComplete = dictation.placedTileIds.length === answerLength
  const stats = getWordDictationStats(dictation.progress)

  const playWord = useCallback(() => {
    if (!word || !speech.canSpeak) return
    if (!feedback) dictation.markPlayed()
    speech.speak(word.russian, `word-dictation-${word.id}`)
  }, [dictation, feedback, speech, word])

  useEffect(() => {
    if (word && dictation.session.phase === 'question') playRef.current?.focus()
    if (!word) practiceRef.current?.focus()
  }, [dictation.session.phase, dictation.session.currentId, word])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onExit()
        return
      }
      if (!word || !speech.canSpeak) return
      if (event.key.toLocaleLowerCase('en') === 'l') {
        event.preventDefault()
        playWord()
        return
      }
      const focusedButton = event.target instanceof HTMLButtonElement && !event.target.disabled
      if (dictation.session.phase === 'feedback' && event.key === 'Enter' && !focusedButton) {
        event.preventDefault()
        dictation.continueSession()
      } else if (dictation.session.phase === 'question' && event.key === 'Backspace') {
        event.preventDefault()
        dictation.undo()
      } else if (
        dictation.session.phase === 'question' &&
        event.key === 'Enter' &&
        answerComplete &&
        !focusedButton
      ) {
        event.preventDefault()
        dictation.grade()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [answerComplete, dictation, onExit, playWord, speech.canSpeak, word])

  if (!speech.canSpeak) {
    return (
      <section className="word-dictation word-dictation--unavailable" aria-labelledby="word-dictation-title">
        <div className="word-dictation__panel word-dictation__unavailable" role="status" aria-live="polite" aria-atomic="true">
          <p className="word-dictation__kicker">Words · Listening</p>
          <h1 id="word-dictation-title">Word Dictation</h1>
          <div className="word-dictation__attention" aria-hidden="true">🔊</div>
          <h2>Russian speech is required</h2>
          <p>
            {speech.unavailableReason ?? 'Russian speech playback is unavailable.'}
            {' '}Install or enable a Russian system voice in your browser or device settings, then return to try again.
          </p>
          <button className="word-dictation__secondary" type="button" onClick={onExit} autoFocus>
            Exit Word Dictation
          </button>
        </div>
      </section>
    )
  }

  if (!word || !dictation.currentItem) {
    return (
      <section className="word-dictation word-dictation--complete" aria-labelledby="word-dictation-complete-title">
        <div className="word-dictation__panel word-dictation__completion" role="status" aria-live="polite" aria-atomic="true">
          <div className="word-dictation__complete-mark" aria-hidden="true">✓</div>
          <p className="word-dictation__kicker">Scheduled round complete</p>
          <h1 id="word-dictation-complete-title">Word Dictation</h1>
          <h2>Слушать отлично!</h2>
          <p>You cleared every new or currently due word.</p>
          <div className="word-dictation__summary" aria-label="Word Dictation progress summary">
            <span><strong>{stats.mastered}/{VOCABULARY.length}</strong> words mastered</span>
            <span><strong>{stats.overall}%</strong> overall level</span>
          </div>
          <div className="word-dictation__completion-actions">
            <button
              ref={practiceRef}
              className="word-dictation__primary"
              type="button"
              onClick={dictation.startPractice}
              autoFocus
            >
              Practice weakest items
            </button>
            <button className="word-dictation__secondary" type="button" onClick={onExit}>
              All games
            </button>
          </div>
        </div>
      </section>
    )
  }

  const tileById = new Map(dictation.tiles.map((tile) => [tile.id, tile]))
  const answeringLocked = !dictation.session.hasPlayed || feedback
  const speechActive = speech.speakingId === `word-dictation-${word.id}`

  return (
    <section className="word-dictation" aria-labelledby="word-dictation-title">
      <header className="word-dictation__header">
        <div>
          <p className="word-dictation__kicker">Words · Listening</p>
          <h1 id="word-dictation-title">Word Dictation</h1>
        </div>
        <div className="word-dictation__header-progress" aria-label="Word Dictation progress">
          <span><strong>{stats.mastered}/{VOCABULARY.length}</strong> mastered</span>
          <span><strong>{stats.overall}%</strong> overall level</span>
        </div>
        <button className="word-dictation__exit" type="button" onClick={onExit} aria-keyshortcuts="Escape">
          Exit
        </button>
      </header>

      <article className="word-dictation__panel word-dictation__question-card">
        <div className="word-dictation__prompt">
          <p className="word-dictation__level">Level {dictation.session.questionLevel}</p>
          <h2>Listen, then spell the word.</h2>
          {showsTransliteration(dictation.session.questionLevel) ? (
            <p className="word-dictation__scaffold">Sounds like: <strong>{word.latin}</strong></p>
          ) : null}
        </div>

        <div className="word-dictation__audio-stage">
          <button
            ref={playRef}
            className={`word-dictation__play${speechActive ? ' word-dictation__play--active' : ''}`}
            type="button"
            onClick={playWord}
            aria-keyshortcuts="L"
            aria-pressed={speechActive}
          >
            <span aria-hidden="true">🔊</span>
            {speechActive ? 'Playing…' : dictation.session.hasPlayed ? 'Play again' : 'Play word'}
            <kbd aria-hidden="true">L</kbd>
          </button>
          <p className="word-dictation__gate-status" aria-live="polite">
            {dictation.session.hasPlayed
              ? 'The letter tiles are ready.'
              : 'Letter tiles unlock after you play the word.'}
          </p>
        </div>

        <div className="word-dictation__answer" role="group" aria-labelledby="word-dictation-answer-label">
          <h3 id="word-dictation-answer-label">Your spelling</h3>
          <div className="word-dictation__slots" aria-label={`${answerLength} letter answer`}>
            {Array.from({ length: answerLength }, (_, index) => {
              const tileId = dictation.placedTileIds[index]
              const tile = tileId ? tileById.get(tileId) : null
              return tile ? (
                <button
                  key={tile.id}
                  className="word-dictation__tile word-dictation__tile--placed"
                  type="button"
                  lang="ru"
                  onClick={() => dictation.removeTile(tile.id)}
                  disabled={answeringLocked}
                  aria-label={`Remove letter ${tile.value} from position ${index + 1}`}
                >
                  {tile.value}
                </button>
              ) : (
                <span className="word-dictation__empty-slot" aria-hidden="true" key={`empty-${index}`} />
              )
            })}
          </div>
        </div>

        <div className="word-dictation__bank" role="group" aria-label="Available Cyrillic letter tiles">
          {dictation.tiles.map((tile) => {
            const used = dictation.placedTileIds.includes(tile.id)
            return (
              <button
                className="word-dictation__tile"
                type="button"
                lang="ru"
                key={tile.id}
                onClick={() => dictation.placeTile(tile.id)}
                disabled={answeringLocked || used || dictation.placedTileIds.length >= answerLength}
                aria-label={`Add Cyrillic letter ${tile.value}`}
              >
                {tile.value}
              </button>
            )
          })}
        </div>

        <div className="word-dictation__tile-actions">
          <button
            className="word-dictation__secondary"
            type="button"
            onClick={dictation.undo}
            disabled={answeringLocked || dictation.placedTileIds.length === 0}
            aria-keyshortcuts="Backspace"
          >
            Undo
          </button>
          <button
            className="word-dictation__secondary"
            type="button"
            onClick={dictation.clear}
            disabled={answeringLocked || dictation.placedTileIds.length === 0}
          >
            Clear
          </button>
          <button
            className="word-dictation__primary"
            type="button"
            onClick={dictation.grade}
            disabled={answeringLocked || !answerComplete}
            aria-keyshortcuts="Enter"
          >
            Check
          </button>
        </div>

        {feedback && dictation.session.result ? (
          <div
            className={`word-dictation__feedback word-dictation__feedback--${dictation.session.result}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div>
              <strong>{dictation.session.result === 'correct' ? 'Correct spelling' : 'Not quite'}</strong>
              {dictation.session.result === 'correct' ? (
                <p><span lang="ru">{word.russian}</span> · {word.latin} means {word.english}.</p>
              ) : (
                <p>
                  You built: <span lang="ru">{dictation.session.learnerAnswer}</span>. The complete correct answer is{' '}
                  <strong lang="ru">{word.russian}</strong> · {word.latin}, meaning {word.english}. This word will return soon.
                </p>
              )}
            </div>
            {dictation.session.result === 'incorrect' ? (
              <button className="word-dictation__secondary" type="button" onClick={playWord}>
                Replay word
              </button>
            ) : null}
            <button
              className="word-dictation__primary"
              type="button"
              onClick={dictation.continueSession}
              autoFocus
            >
              Continue
            </button>
          </div>
        ) : null}
      </article>

      <aside className="word-dictation__learning-note" aria-label="Dictation learning method">
        <span aria-hidden="true">★</span>
        <p><strong>Listen before you look.</strong> Missed spellings return after a short two-word gap.</p>
      </aside>
    </section>
  )
}
