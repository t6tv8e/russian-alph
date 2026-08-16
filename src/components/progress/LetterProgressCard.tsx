import { getLetterAccuracy, getLetterStatus } from '../../learning/progress'
import { MAX_LEVEL } from '../../learning/scheduler'
import type { CyrillicLetter, LetterProgress } from '../../learning/types'

interface LetterProgressCardProps {
  letter: CyrillicLetter
  progress: LetterProgress
}

export function LetterProgressCard({ letter, progress }: LetterProgressCardProps) {
  const status = getLetterStatus(progress)
  const accuracy = getLetterAccuracy(progress)

  return (
    <li
      className={`progress-letter-card progress-letter-card--level-${progress.level}`}
      aria-label={`${letter.uppercase}: ${status}, level ${progress.level} of ${MAX_LEVEL}`}
    >
      <div className="progress-letter-topline">
        <strong lang="ru">{letter.uppercase}</strong>
        <span>{letter.answer}</span>
      </div>
      <span className="letter-status">{status}</span>
      <div
        className="letter-level-meter"
        role="progressbar"
        aria-label={`${letter.uppercase} knowledge`}
        aria-valuemin={0}
        aria-valuemax={MAX_LEVEL}
        aria-valuenow={progress.level}
      >
        {Array.from({ length: MAX_LEVEL }, (_, index) => (
          <i
            className={index < progress.level ? 'level-step level-step--filled' : 'level-step'}
            key={index}
          />
        ))}
      </div>
      <small>
        {accuracy === null
          ? 'No answers yet'
          : `${progress.correctAttempts}/${progress.attempts} correct · ${accuracy}%`}
      </small>
    </li>
  )
}
