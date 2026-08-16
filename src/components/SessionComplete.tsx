import { ALPHABET } from '../data/alphabet'
import {
  getMasteredCount,
  getNextReviewAt,
  getOverallProgress,
} from '../learning/scheduler'
import type { LearningProgress } from '../learning/types'

interface SessionCompleteProps {
  progress: LearningProgress
  onPractice: () => void
}

function formatNextReview(timestamp: number | null): string {
  if (!timestamp) {
    return 'New letters are ready whenever you are.'
  }

  const difference = Math.max(0, timestamp - Date.now())
  const minutes = Math.ceil(difference / (60 * 1000))

  if (minutes <= 1) {
    return 'Your next review is due in less than a minute.'
  }
  if (minutes < 60) {
    return `Your next review is due in about ${minutes} minutes.`
  }

  const hours = Math.ceil(minutes / 60)
  if (hours < 24) {
    return `Your next review is due in about ${hours} hours.`
  }

  const days = Math.ceil(hours / 24)
  return `Your next review is due in about ${days} day${days === 1 ? '' : 's'}.`
}

export function SessionComplete({ progress, onPractice }: SessionCompleteProps) {
  const mastered = getMasteredCount(progress)
  const overall = getOverallProgress(progress)

  return (
    <section className="complete-card">
      <div className="complete-mark" aria-hidden="true">✓</div>
      <p className="section-kicker">Review complete</p>
      <h1>Отлично!</h1>
      <p className="complete-lead">Nice work. A short break helps these letters stick.</p>

      <div className="complete-stats">
        <div>
          <strong>{overall}%</strong>
          <span>alphabet knowledge</span>
        </div>
        <div>
          <strong>{mastered}/{ALPHABET.length}</strong>
          <span>letters mastered</span>
        </div>
      </div>

      <p className="next-review">{formatNextReview(getNextReviewAt(progress))}</p>
      <button type="button" className="practice-button" onClick={onPractice}>
        Practice anyway
      </button>
    </section>
  )
}
