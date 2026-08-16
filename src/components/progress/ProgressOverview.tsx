import { ALPHABET } from '../../data/alphabet'
import { getDueReviewCount } from '../../learning/progress'
import {
  getMasteredCount,
  getOverallProgress,
  getSessionStats,
} from '../../learning/scheduler'
import type { LearningProgress } from '../../learning/types'

interface ProgressOverviewProps {
  progress: LearningProgress
}

export function ProgressOverview({ progress }: ProgressOverviewProps) {
  const overallProgress = getOverallProgress(progress)
  const masteredCount = getMasteredCount(progress)
  const stats = getSessionStats(progress)
  const reviewCount = getDueReviewCount(progress)

  return (
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
  )
}
