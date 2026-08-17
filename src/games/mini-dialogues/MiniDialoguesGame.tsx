import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRussianSpeech } from '../../hooks/useRussianSpeech'
import { MINI_DIALOGUES } from './content'
import {
  buildDialogueChoices,
  createMiniDialoguesProgress,
  getDialogueScaffolds,
  getMiniDialogueStats,
  gradeDialogueChoice,
  hydrateMiniDialoguesProgress,
  MINI_DIALOGUES_STORAGE_KEY,
  recordDialogueAnswer,
  selectNextDialogueId,
  selectWeakestDialogueId,
  type MiniDialoguesProgress,
} from './engine'
import './mini-dialogues.css'

export interface MiniDialoguesGameProps {
  onExit: () => void
}

const CHOICE_KEYS = ['A', 'B', 'C', 'D'] as const

function readProgress(): MiniDialoguesProgress {
  if (typeof window === 'undefined') return createMiniDialoguesProgress(MINI_DIALOGUES)
  try {
    const stored = window.localStorage.getItem(MINI_DIALOGUES_STORAGE_KEY)
    return hydrateMiniDialoguesProgress(stored ? JSON.parse(stored) : null, MINI_DIALOGUES)
  } catch {
    return createMiniDialoguesProgress(MINI_DIALOGUES)
  }
}

function saveProgress(progress: MiniDialoguesProgress): void {
  try {
    window.localStorage.setItem(MINI_DIALOGUES_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // The game remains playable when storage is blocked or full.
  }
}

export function MiniDialoguesGame({ onExit }: MiniDialoguesGameProps) {
  const [progress, setProgress] = useState<MiniDialoguesProgress>(readProgress)
  const speech = useRussianSpeech()
  const firstChoiceRef = useRef<HTMLButtonElement>(null)
  const completionHeadingRef = useRef<HTMLHeadingElement>(null)
  const current = MINI_DIALOGUES.find(({ id }) => id === progress.session.currentItemId) ?? null
  const itemProgress = current ? progress.items[current.id] : null
  const feedback = progress.session.phase === 'feedback'
  const level = feedback ? (progress.session.preAnswerLevel ?? itemProgress?.level ?? 0) : (itemProgress?.level ?? 0)
  const scaffolds = getDialogueScaffolds(level)
  const stats = getMiniDialogueStats(progress)
  const choices = useMemo(() => current ? buildDialogueChoices(current) : [], [current])

  useEffect(() => saveProgress(progress), [progress])

  useEffect(() => {
    if (progress.session.phase === 'question') firstChoiceRef.current?.focus()
    if (progress.session.phase === 'complete') completionHeadingRef.current?.focus()
  }, [progress.session.currentItemId, progress.session.phase])

  const choose = useCallback((selected: string) => {
    if (!current || progress.session.phase !== 'question') return
    const correct = gradeDialogueChoice(current, selected)
    const recorded = recordDialogueAnswer(progress, current.id, correct)
    const next: MiniDialoguesProgress = {
      ...recorded,
      session: {
        ...recorded.session,
        phase: 'feedback',
        selectedChoice: selected,
        preAnswerLevel: itemProgress?.level ?? 0,
      },
    }
    saveProgress(next)
    setProgress(next)
  }, [current, itemProgress?.level, progress])

  const continueRound = useCallback(() => {
    if (!current || progress.session.phase !== 'feedback') return
    const recentIds = [...progress.session.recentIds, current.id].slice(-2)
    const base: MiniDialoguesProgress = {
      ...progress,
      session: { ...progress.session, recentIds, selectedChoice: null, preAnswerLevel: null, phase: 'question' },
    }
    const nextId = progress.session.practiceMode
      ? selectWeakestDialogueId(MINI_DIALOGUES, base, recentIds)
      : selectNextDialogueId(MINI_DIALOGUES, base, Date.now(), recentIds)
    const next: MiniDialoguesProgress = {
      ...base,
      session: { ...base.session, currentItemId: nextId, phase: nextId ? 'question' : 'complete' },
    }
    saveProgress(next)
    setProgress(next)
  }, [current, progress])

  const startPractice = useCallback(() => {
    const nextId = selectWeakestDialogueId(MINI_DIALOGUES, progress, [])
    const next: MiniDialoguesProgress = {
      ...progress,
      session: {
        currentItemId: nextId,
        recentIds: [],
        practiceMode: true,
        phase: nextId ? 'question' : 'complete',
        selectedChoice: null,
        preAnswerLevel: null,
      },
    }
    saveProgress(next)
    setProgress(next)
  }, [progress])

  const finishPractice = useCallback(() => {
    const next: MiniDialoguesProgress = {
      ...progress,
      session: { ...progress.session, currentItemId: null, practiceMode: false, phase: 'complete', selectedChoice: null, preAnswerLevel: null },
    }
    saveProgress(next)
    setProgress(next)
  }, [progress])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onExit()
        return
      }
      if (progress.session.phase === 'question') {
        const index = CHOICE_KEYS.indexOf(event.key.toUpperCase() as (typeof CHOICE_KEYS)[number])
        const choice = choices[index]
        if (index >= 0 && choice) {
          event.preventDefault()
          choose(choice.text)
        }
      } else if (progress.session.phase === 'feedback' && event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        continueRound()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [choices, choose, continueRound, onExit, progress.session.phase])

  if (!current || progress.session.phase === 'complete') {
    return (
      <section className="mini-dialogues mini-dialogues--complete" aria-labelledby="mini-dialogues-complete-title">
        <article className="mini-dialogues__complete-card">
          <p className="mini-dialogues__eyebrow">Conversation round complete</p>
          <h1 id="mini-dialogues-complete-title" ref={completionHeadingRef} tabIndex={-1}>Отлично!</h1>
          <p>You cleared every new or currently due dialogue.</p>
          <div className="mini-dialogues__summary" aria-label="Mini Dialogues progress summary">
            <span><strong>{stats.mastered}</strong> mastered</span>
            <span><strong>{stats.accuracy}%</strong> accuracy</span>
            <span><strong>{stats.levelPercent}%</strong> overall level</span>
          </div>
          <div className="mini-dialogues__actions">
            <button className="mini-dialogues__primary" type="button" onClick={startPractice}>Practice weakest items</button>
            <button className="mini-dialogues__secondary" type="button" onClick={onExit}>All games</button>
          </div>
        </article>
      </section>
    )
  }

  const selected = progress.session.selectedChoice
  const correct = feedback && selected === current.reply
  const promptSpeechId = `mini-dialogues-prompt-${current.id}`
  const replySpeechId = `mini-dialogues-reply-${current.id}`

  return (
    <section className="mini-dialogues" aria-labelledby="mini-dialogues-title">
      <header className="mini-dialogues__header">
        <button className="mini-dialogues__exit" type="button" onClick={onExit} aria-keyshortcuts="Escape">← Exit</button>
        <div>
          <p className="mini-dialogues__eyebrow">Conversations · Responses</p>
          <h1 id="mini-dialogues-title">Mini Dialogues</h1>
        </div>
        {progress.session.practiceMode ? (
          <button className="mini-dialogues__secondary" type="button" onClick={finishPractice}>Finish practice</button>
        ) : (
          <div className="mini-dialogues__stats" aria-label="Game progress">
            <span><strong>{stats.mastered}</strong>/{MINI_DIALOGUES.length} mastered</span>
            <span><strong>{stats.levelPercent}%</strong> level</span>
          </div>
        )}
      </header>

      <article className="mini-dialogues__card">
        <div className="mini-dialogues__context">
          <span className="mini-dialogues__setting">{current.setting}</span>
          <span>Level {level}</span>
        </div>
        <div className="mini-dialogues__prompt">
          <p>Speaker А says:</p>
          <h2 lang="ru">{current.prompt}</h2>
          {scaffolds.showPromptLatin ? <p className="mini-dialogues__latin">{current.promptLatin}</p> : null}
          {scaffolds.showPromptEnglish ? <p className="mini-dialogues__english">{current.promptEnglish}</p> : null}
          <button
            className="mini-dialogues__play"
            type="button"
            onClick={() => speech.speak(current.prompt, promptSpeechId)}
            disabled={!speech.canSpeak}
            aria-label="Play Russian prompt"
            aria-pressed={speech.speakingId === promptSpeechId}
            title={speech.unavailableReason ?? undefined}
          >
            ▶ Play prompt
          </button>
        </div>

        <fieldset className="mini-dialogues__choices">
          <legend>How should speaker Б reply?</legend>
          <div className="mini-dialogues__choice-grid">
            {choices.map((choice, index) => {
              const isCorrect = feedback && choice.text === current.reply
              const isWrong = feedback && choice.text === selected && !isCorrect
              return (
                <button
                  ref={index === 0 ? firstChoiceRef : undefined}
                  className={`mini-dialogues__choice${isCorrect ? ' mini-dialogues__choice--correct' : ''}${isWrong ? ' mini-dialogues__choice--incorrect' : ''}`}
                  type="button"
                  key={choice.id}
                  onClick={() => choose(choice.text)}
                  disabled={feedback}
                  aria-keyshortcuts={CHOICE_KEYS[index]}
                >
                  <span className="mini-dialogues__choice-key" aria-hidden="true">{CHOICE_KEYS[index]}</span>
                  <span lang="ru">{choice.text}</span>
                </button>
              )
            })}
          </div>
          <p className="mini-dialogues__help">Choose a reply or press A–D.</p>
        </fieldset>

        {feedback ? (
          <section className={`mini-dialogues__feedback mini-dialogues__feedback--${correct ? 'correct' : 'incorrect'}`} role="status" aria-live="polite" aria-atomic="true">
            <strong>{correct ? `${current.reply} is the natural reply.` : `The complete correct reply is ${current.reply} This dialogue will return soon.`}</strong>
            <div className="mini-dialogues__exchange" aria-label="Completed exchange">
              <div><b>А</b><p lang="ru">{current.prompt}</p><span>{current.promptLatin}</span><span>{current.promptEnglish}</span></div>
              <div><b>Б</b><p lang="ru">{current.reply}</p><span>{current.replyLatin}</span><span>{current.replyEnglish}</span></div>
            </div>
            <p>{current.explanation}</p>
            <div className="mini-dialogues__feedback-actions">
              <button className="mini-dialogues__play" type="button" onClick={() => speech.speak(current.prompt, promptSpeechId)} disabled={!speech.canSpeak}>Play prompt</button>
              <button className="mini-dialogues__play" type="button" onClick={() => speech.speak(current.reply, replySpeechId)} disabled={!speech.canSpeak}>Play reply</button>
              <button className="mini-dialogues__primary" type="button" onClick={continueRound} autoFocus>Continue</button>
            </div>
          </section>
        ) : null}
      </article>
    </section>
  )
}
