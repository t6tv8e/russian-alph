import type { ReactNode } from 'react'
import { useRussianSpeech } from '../../hooks/useRussianSpeech'
import type { AnswerMode } from '../../learning/types'
import type { VocabularyWord } from '../../learning/vocabularyTypes'
import { AudioButton } from '../common/AudioButton'

interface WordCardProps {
  word: VocabularyWord
  mode: AnswerMode
  level: number
  revealed: boolean
  children: ReactNode
}

export function WordCard({ word, mode, level, revealed, children }: WordCardProps) {
  const speech = useRussianSpeech()
  const speechId = `vocabulary-${word.id}`

  return (
    <article className="lesson-card word-card">
      <div className="mode-label">
        <span className={`mode-dot mode-dot--${mode}`} aria-hidden="true" />
        {mode === 'choice' ? 'Match the meaning' : 'Recall the meaning'}
        <span aria-hidden="true">·</span>
        Level {Math.min(level + 1, 5)}
      </div>

      <div className="word-stage">
        <p className="letter-prompt">What does this Russian word mean?</p>
        <h1 className="russian-word" lang="ru" aria-label={`Russian word ${word.russian}`}>
          {word.russian}
        </h1>

        <div className="word-audio-row">
          <AudioButton
            label={`Play ${word.russian} in Russian`}
            active={speech.speakingId === speechId}
            disabled={!speech.canSpeak}
            unavailableReason={speech.unavailableReason}
            onPlay={() => speech.speak(word.russian, speechId)}
          />
          <div>
            <strong>Listen to the word</strong>
            <span>{revealed ? `${word.latin} · ${word.english}` : 'Meaning appears after your answer'}</span>
          </div>
        </div>
      </div>

      <div className="answer-area">{children}</div>
    </article>
  )
}
