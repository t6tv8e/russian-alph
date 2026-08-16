import { VOCABULARY } from '../../data/vocabulary'
import {
  getNextVocabularyReviewAt,
  getVocabularyMasteredCount,
  getVocabularyOverallProgress,
} from '../../learning/vocabulary'
import type { VocabularyProgress } from '../../learning/vocabularyTypes'

interface VocabularyCompleteProps {
  progress: VocabularyProgress
  onPractice: () => void
  onExit: () => void
}

function formatNextReview(timestamp: number | null): string {
  if (!timestamp) {
    return 'New words are ready whenever you are.'
  }

  const difference = Math.max(0, timestamp - Date.now())
  const minutes = Math.ceil(difference / (60 * 1000))

  if (minutes <= 1) {
    return 'Your next word review is due in less than a minute.'
  }
  if (minutes < 60) {
    return `Your next word review is due in about ${minutes} minutes.`
  }

  const hours = Math.ceil(minutes / 60)
  if (hours < 24) {
    return `Your next word review is due in about ${hours} hours.`
  }

  const days = Math.ceil(hours / 24)
  return `Your next word review is due in about ${days} day${days === 1 ? '' : 's'}.`
}

export function VocabularyComplete({
  progress,
  onPractice,
  onExit,
}: VocabularyCompleteProps) {
  const mastered = getVocabularyMasteredCount(progress)
  const overall = getVocabularyOverallProgress(progress)

  return (
    <section className="complete-card">
      <div className="complete-mark" aria-hidden="true">✓</div>
      <p className="section-kicker">Word review complete</p>
      <h1>Отлично!</h1>
      <p className="complete-lead">Nice work. A short break helps these meanings stick.</p>

      <div className="complete-stats">
        <div>
          <strong>{overall}%</strong>
          <span>vocabulary knowledge</span>
        </div>
        <div>
          <strong>{mastered}/{VOCABULARY.length}</strong>
          <span>words mastered</span>
        </div>
      </div>

      <p className="next-review">{formatNextReview(getNextVocabularyReviewAt(progress))}</p>
      <div className="complete-actions">
        <button type="button" className="secondary-button" onClick={onExit}>
          Choose another game
        </button>
        <button type="button" className="practice-button" onClick={onPractice}>
          Practice anyway
        </button>
      </div>
    </section>
  )
}
