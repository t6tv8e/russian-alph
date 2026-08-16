import { ALPHABET } from '../data/alphabet'
import {
  getMasteredCount,
  getOverallProgress,
  getSessionStats,
} from '../learning/scheduler'
import type { LearningProgress } from '../learning/types'

interface ProgressHeaderProps {
  progress: LearningProgress
}

export function ProgressHeader({ progress }: ProgressHeaderProps) {
  const overallProgress = getOverallProgress(progress)
  const masteredCount = getMasteredCount(progress)
  const stats = getSessionStats(progress)

  return (
    <header className="app-header">
      <a className="brand" href="#lesson" aria-label="Быстро Буквы home">
        <span className="brand-mark" aria-hidden="true">Я</span>
        <span>
          <strong>Быстро Буквы</strong>
          <small>Cyrillic, one letter at a time</small>
        </span>
      </a>

      <div className="progress-summary" aria-label={`${overallProgress}% alphabet knowledge`}>
        <div className="progress-copy">
          <span><strong>{masteredCount}</strong> of {ALPHABET.length} mastered</span>
          <span>{stats.attempts > 0 ? `${stats.accuracy}% accuracy` : 'Ready to begin'}</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={overallProgress}
        >
          <span className="progress-fill" style={{ width: `${overallProgress}%` }} />
        </div>
      </div>
    </header>
  )
}
