import { useCallback, useEffect, useRef } from 'react'
import { ALPHABET } from '../../data/alphabet'
import { useListeningSession } from '../../hooks/useListeningSession'
import { useRussianSpeech } from '../../hooks/useRussianSpeech'
import {
  getListeningDueCount,
  getListeningStats,
  getNextListeningReviewAt,
} from '../../learning/listeningScheduler'
import '../../styles/listening.css'

export interface ListenPickGameProps {
  onExit: () => void
}

const CHOICE_KEYS = ['1', '2', '3', '4'] as const

function formatNextReview(timestamp: number | null): string {
  if (timestamp === null) {
    return 'Your listening deck is ready for free practice.'
  }

  const minutes = Math.max(1, Math.ceil((timestamp - Date.now()) / (60 * 1000)))
  if (minutes < 60) {
    return `The next scheduled review is in about ${minutes} minute${minutes === 1 ? '' : 's'}.`
  }

  const hours = Math.ceil(minutes / 60)
  if (hours < 24) {
    return `The next scheduled review is in about ${hours} hour${hours === 1 ? '' : 's'}.`
  }

  const days = Math.ceil(hours / 24)
  return `The next scheduled review is in about ${days} day${days === 1 ? '' : 's'}.`
}

export function ListenPickGame({ onExit }: ListenPickGameProps) {
  const session = useListeningSession()
  const speech = useRussianSpeech()
  const listenActionRef = useRef<HTMLButtonElement>(null)
  const completionHeadingRef = useRef<HTMLHeadingElement>(null)
  const stats = getListeningStats(session.progress)
  const currentLetter = session.currentLetter
  const revealed = session.phase === 'feedback'

  const playCurrentLetter = useCallback(() => {
    if (!currentLetter || !speech.canSpeak || revealed) {
      return
    }

    session.markListened()
    speech.speak(currentLetter.spokenName, `listening-letter-${currentLetter.id}`)
  }, [currentLetter, revealed, session, speech])

  useEffect(() => {
    if (currentLetter && session.phase === 'question' && !session.hasListened) {
      listenActionRef.current?.focus()
    }
  }, [currentLetter, session.hasListened, session.phase, session.questionNumber, speech.canSpeak])

  useEffect(() => {
    if (!currentLetter) {
      completionHeadingRef.current?.focus()
    }
  }, [currentLetter])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onExit()
        return
      }

      if (!currentLetter) {
        return
      }

      if (session.phase === 'question' && event.key.toLocaleLowerCase('en') === 'l') {
        if (speech.canSpeak) {
          event.preventDefault()
          playCurrentLetter()
        }
        return
      }

      const choiceIndex = CHOICE_KEYS.indexOf(event.key as (typeof CHOICE_KEYS)[number])
      const choice = session.choices[choiceIndex]
      if (
        session.phase === 'question' &&
        session.hasListened &&
        choiceIndex >= 0 &&
        choice
      ) {
        event.preventDefault()
        session.chooseAnswer(choice.letterId)
        return
      }

      if (
        session.phase === 'feedback' &&
        event.key === 'Enter' &&
        !(event.target instanceof HTMLButtonElement)
      ) {
        event.preventDefault()
        session.continueSession()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    currentLetter,
    onExit,
    playCurrentLetter,
    session,
    speech.canSpeak,
  ])

  if (!currentLetter) {
    const dueCount = getListeningDueCount(session.progress)
    const nextReviewAt = getNextListeningReviewAt(session.progress)

    return (
      <section className="listen-pick listen-pick--complete" aria-labelledby="listening-complete-title">
        <div className="listen-pick__complete-card" role="status" aria-live="polite">
          <span className="listen-pick__complete-icon" aria-hidden="true">✓</span>
          <p className="listen-pick__eyebrow">Listening round complete</p>
          <h1 id="listening-complete-title" ref={completionHeadingRef} tabIndex={-1}>
            Отлично!
          </h1>
          <p className="listen-pick__complete-lead">
            You have cleared every new or scheduled letter. A short break helps the sounds stick.
          </p>

          <div className="listen-pick__complete-stats" aria-label="Listening progress summary">
            <div>
              <strong>{stats.practised}/{ALPHABET.length}</strong>
              <span>letters practised</span>
            </div>
            <div>
              <strong>{stats.attempts > 0 ? `${stats.accuracy}%` : '—'}</strong>
              <span>listening accuracy</span>
            </div>
            <div>
              <strong>{stats.mastered}</strong>
              <span>sounds mastered</span>
            </div>
          </div>

          <p className="listen-pick__next-review">
            {dueCount > 0
              ? `${dueCount} letter${dueCount === 1 ? ' is' : 's are'} ready to review.`
              : formatNextReview(nextReviewAt)}
          </p>

          <div className="listen-pick__complete-actions">
            <button
              className="listen-pick__primary-button"
              type="button"
              onClick={session.startPractice}
            >
              Practice weakest letters
            </button>
            <button className="listen-pick__secondary-button" type="button" onClick={onExit}>
              Exit listening game
            </button>
          </div>
        </div>
      </section>
    )
  }

  const speechId = `listening-letter-${currentLetter.id}`
  const isSpeaking = speech.speakingId === speechId
  const progressPercent = Math.round((stats.practised / ALPHABET.length) * 100)

  return (
    <section className="listen-pick" aria-labelledby="listen-pick-title">
      <header className="listen-pick__header">
        <button
          className="listen-pick__exit"
          type="button"
          onClick={onExit}
          aria-label="Exit Listen and Pick"
          aria-keyshortcuts="Escape"
        >
          <span aria-hidden="true">←</span>
          Exit
        </button>

        <div className="listen-pick__title-group">
          <p className="listen-pick__eyebrow">Train your ear</p>
          <h1 id="listen-pick-title">Listen &amp; Pick</h1>
        </div>

        {session.practiceMode ? (
          <button
            className="listen-pick__finish-practice"
            type="button"
            onClick={session.endPractice}
          >
            Finish practice
          </button>
        ) : (
          <span className="listen-pick__accuracy">
            <strong>{stats.attempts > 0 ? `${stats.accuracy}%` : '—'}</strong>
            accuracy
          </span>
        )}
      </header>

      <div className="listen-pick__progress-row">
        <div className="listen-pick__progress-copy">
          <span>{session.practiceMode ? 'Adaptive practice' : 'Alphabet listening path'}</span>
          <strong>{stats.practised} of {ALPHABET.length} letters practised</strong>
        </div>
        <div
          className="listen-pick__progress-track"
          role="progressbar"
          aria-label="Letters practised"
          aria-valuemin={0}
          aria-valuemax={ALPHABET.length}
          aria-valuenow={stats.practised}
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <article className="listen-pick__card">
        <div className="listen-pick__prompt">
          <span className="listen-pick__step" aria-hidden="true">1</span>
          <div>
            <p className="listen-pick__eyebrow">Listen first</p>
            <h2>Which Cyrillic letter do you hear?</h2>
            <p>Play the Russian letter name. Replay it as often as you need.</p>
          </div>
        </div>

        <div className="listen-pick__audio-stage">
          {speech.canSpeak ? (
            <button
              ref={listenActionRef}
              className={`listen-pick__play${isSpeaking ? ' listen-pick__play--active' : ''}`}
              type="button"
              onClick={playCurrentLetter}
              disabled={revealed}
              aria-keyshortcuts="L"
              aria-label={session.hasListened ? 'Replay Russian letter name' : 'Play Russian letter name'}
              aria-pressed={isSpeaking}
            >
              <span className="listen-pick__speaker" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4H4Z" />
                  <path className="listen-pick__sound-wave" d="M15 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
                </svg>
              </span>
              <span>{isSpeaking ? 'Playing…' : session.hasListened ? 'Play again' : 'Play letter name'}</span>
              <kbd aria-hidden="true">L</kbd>
            </button>
          ) : (
            <div className="listen-pick__audio-fallback" role="status">
              <p>{speech.unavailableReason ?? 'Russian speech playback is unavailable.'}</p>
              <button
                ref={listenActionRef}
                className="listen-pick__secondary-button"
                type="button"
                onClick={session.markListened}
                disabled={revealed}
              >
                Continue with visual practice
              </button>
            </div>
          )}
          <p className="listen-pick__audio-status" aria-live="polite">
            {session.hasListened
              ? 'Now choose the matching Cyrillic letter.'
              : speech.canSpeak
                ? 'Choices unlock after you play the sound.'
                : 'Choose visual practice to unlock the letters.'}
          </p>
        </div>

        <fieldset className="listen-pick__choices" aria-describedby="listen-pick-choice-help">
          <legend>
            <span className="listen-pick__step" aria-hidden="true">2</span>
            Pick the matching letter
          </legend>
          <div className="listen-pick__choice-grid">
            {session.choices.map((choice, index) => {
              const isCorrect = revealed && choice.letterId === currentLetter.id
              const isIncorrect =
                revealed &&
                choice.letterId === session.selectedChoiceId &&
                choice.letterId !== currentLetter.id
              const stateClass = isCorrect
                ? ' listen-pick__choice--correct'
                : isIncorrect
                  ? ' listen-pick__choice--incorrect'
                  : ''

              return (
                <button
                  className={`listen-pick__choice${stateClass}`}
                  type="button"
                  key={choice.letterId}
                  onClick={() => session.chooseAnswer(choice.letterId)}
                  disabled={revealed || !session.hasListened}
                  aria-label={`Choose Cyrillic letter ${choice.uppercase}`}
                  aria-keyshortcuts={CHOICE_KEYS[index]}
                >
                  <span className="listen-pick__choice-key" aria-hidden="true">
                    {CHOICE_KEYS[index]}
                  </span>
                  <span className="listen-pick__choice-letter" lang="ru">
                    <b>{choice.uppercase}</b>
                    <small>{choice.lowercase}</small>
                  </span>
                  {isCorrect ? <span className="listen-pick__choice-mark" aria-hidden="true">✓</span> : null}
                  {isIncorrect ? <span className="listen-pick__choice-mark" aria-hidden="true">×</span> : null}
                </button>
              )
            })}
          </div>
          <p id="listen-pick-choice-help" className="listen-pick__choice-help">
            Use keys 1–4 or choose a card. Missed sounds return quickly.
          </p>
        </fieldset>

        {session.result ? (
          <section
            className={`listen-pick__feedback listen-pick__feedback--${session.result}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="listen-pick__feedback-icon" aria-hidden="true">
              {session.result === 'correct' ? '✓' : '!'}
            </span>
            <div className="listen-pick__feedback-copy">
              <strong>{session.result === 'correct' ? 'That’s right!' : 'Not quite — here it is'}</strong>
              <p>
                The answer is{' '}
                <b className="listen-pick__answer" lang="ru">
                  {currentLetter.uppercase} {currentLetter.lowercase}
                </b>
                . Its Russian name is <span lang="ru">{currentLetter.spokenName}</span>.
                {session.result === 'incorrect' ? ' You’ll hear it again soon.' : ''}
              </p>
            </div>
            <button
              className="listen-pick__primary-button listen-pick__continue"
              type="button"
              onClick={session.continueSession}
              autoFocus
            >
              Continue
              <span aria-hidden="true">→</span>
            </button>
          </section>
        ) : null}
      </article>

      <aside className="listen-pick__learning-note" aria-label="Listening practice method">
        <span aria-hidden="true">↻</span>
        <p><strong>Adaptive listening</strong> Misses retry quickly; correct answers return at longer intervals.</p>
      </aside>
    </section>
  )
}
