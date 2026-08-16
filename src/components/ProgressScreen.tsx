import { ALPHABET } from '../data/alphabet'
import {
  getMasteredCount,
  getOverallProgress,
  getSessionStats,
  MAX_LEVEL,
} from '../learning/scheduler'
import type { LearningProgress, LetterProgress } from '../learning/types'

interface ProgressScreenProps {
  progress: LearningProgress
  onBack: () => void
}

function getLetterStatus(progress: LetterProgress): string {
  if (progress.level === 0) {
    return 'Not started'
  }
  if (progress.level === MAX_LEVEL) {
    return 'Mastered'
  }
  if (progress.typingUnlocked) {
    return 'Typed recall'
  }
  return 'Learning'
}

export function ProgressScreen({ progress, onBack }: ProgressScreenProps) {
  const overallProgress = getOverallProgress(progress)
  const masteredCount = getMasteredCount(progress)
  const stats = getSessionStats(progress)
  const reviewCount = Object.values(progress.letters).filter(
    (letter) => letter.attempts > 0 && letter.nextDueAt <= Date.now(),
  ).length

  return (
    <section className="progress-screen" aria-labelledby="progress-title">
      <div className="progress-screen-heading">
        <div>
          <p className="section-kicker">Your learning journey</p>
          <h1 id="progress-title">Your Cyrillic progress</h1>
          <p>Every answer strengthens a letter. Typed recall is the final step toward mastery.</p>
        </div>
        <button type="button" className="back-to-lesson" onClick={onBack}>
          <span aria-hidden="true">←</span>
          Back to lesson
        </button>
      </div>

      <div className="progress-overview" aria-label="Progress summary">
        <div className="overview-stat overview-stat--primary">
          <strong>{overallProgress}%</strong>
          <span>alphabet knowledge</span>
        </div>
        <div className="overview-stat">
          <strong>{masteredCount}/{ALPHABET.length}</strong>
          <span>letters mastered</span>
        </div>
        <div className="overview-stat">
          <strong>{stats.attempts > 0 ? `${stats.accuracy}%` : '—'}</strong>
          <span>answer accuracy</span>
        </div>
        <div className="overview-stat">
          <strong>{reviewCount}</strong>
          <span>reviews ready</span>
        </div>
      </div>

      <div className="alphabet-progress-heading">
        <div>
          <h2>Letter by letter</h2>
          <p>Five filled steps means a letter is mastered.</p>
        </div>
        <div className="progress-legend" aria-label="Progress legend">
          <span><i className="legend-dot legend-dot--learning" />Learning</span>
          <span><i className="legend-dot legend-dot--recall" />Typed recall</span>
          <span><i className="legend-dot legend-dot--mastered" />Mastered</span>
        </div>
      </div>

      <ul className="alphabet-progress-grid" aria-label="Letter progress">
        {ALPHABET.map((letter) => {
          const letterProgress = progress.letters[letter.id]
          const status = getLetterStatus(letterProgress)
          const accuracy = letterProgress.attempts > 0
            ? Math.round((letterProgress.correctAttempts / letterProgress.attempts) * 100)
            : null

          return (
            <li
              className={`progress-letter-card progress-letter-card--level-${letterProgress.level}`}
              key={letter.id}
              aria-label={`${letter.uppercase}: ${status}, level ${letterProgress.level} of ${MAX_LEVEL}`}
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
                aria-valuenow={letterProgress.level}
              >
                {Array.from({ length: MAX_LEVEL }, (_, index) => (
                  <i
                    className={index < letterProgress.level ? 'level-step level-step--filled' : 'level-step'}
                    key={index}
                  />
                ))}
              </div>
              <small>
                {accuracy === null
                  ? 'No answers yet'
                  : `${letterProgress.correctAttempts}/${letterProgress.attempts} correct · ${accuracy}%`}
              </small>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
