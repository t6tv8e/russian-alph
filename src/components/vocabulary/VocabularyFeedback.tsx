import type { AnswerResult } from '../../learning/types'
import type { VocabularyWord } from '../../learning/vocabularyTypes'

interface VocabularyFeedbackProps {
  result: AnswerResult
  word: VocabularyWord
  onContinue: () => void
}

export function VocabularyFeedback({
  result,
  word,
  onContinue,
}: VocabularyFeedbackProps) {
  const correct = result === 'correct'

  return (
    <section
      className={`feedback feedback--${result}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="feedback-icon" aria-hidden="true">{correct ? '✓' : '!'}</span>
      <div className="feedback-copy">
        <strong>{correct ? 'Exactly right!' : 'Not quite yet'}</strong>
        <span>
          <b lang="ru">{word.russian}</b> <span aria-hidden="true">·</span>{' '}
          {word.latin} means <b>{word.english}</b>
          {correct ? '.' : ' — we’ll bring it back soon.'}
        </span>
      </div>
      <button className="continue-button" type="button" onClick={onContinue} autoFocus>
        Continue
        <span aria-hidden="true">→</span>
      </button>
    </section>
  )
}
