import type { AnswerResult, CyrillicLetter } from '../../learning/types'

interface FeedbackPanelProps {
  result: AnswerResult
  letter: CyrillicLetter
  onContinue: () => void
}

export function FeedbackPanel({ result, letter, onContinue }: FeedbackPanelProps) {
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
          <span lang="ru">{letter.uppercase}</span> is <b>{letter.answer}</b>
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
