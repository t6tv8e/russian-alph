import { ALPHABET } from '../../data/alphabet'
import type { Theme } from '../../hooks/useTheme'
import {
  getMasteredCount,
  getOverallProgress,
  getSessionStats,
} from '../../learning/scheduler'
import type { LearningProgress } from '../../learning/types'
import { ThemeToggle } from '../common/ThemeToggle'

interface ProgressHeaderProps {
  progress: LearningProgress
  activeView: 'lesson' | 'progress'
  onShowLesson: () => void
  onShowProgress: () => void
  theme: Theme
  onToggleTheme: () => void
}

export function ProgressHeader({
  progress,
  activeView,
  onShowLesson,
  onShowProgress,
  theme,
  onToggleTheme,
}: ProgressHeaderProps) {
  const overallProgress = getOverallProgress(progress)
  const masteredCount = getMasteredCount(progress)
  const stats = getSessionStats(progress)
  const showingProgress = activeView === 'progress'

  return (
    <header className="app-header">
      <button
        className="brand brand-button"
        type="button"
        onClick={onShowLesson}
        aria-label="Быстро Буквы home"
      >
        <span className="brand-mark" aria-hidden="true">Я</span>
        <span className="brand-copy">
          <strong>Быстро Буквы</strong>
          <small>Cyrillic, one letter at a time</small>
        </span>
      </button>

      <div className="header-progress">
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

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        <button
          className="progress-nav-button"
          type="button"
          onClick={showingProgress ? onShowLesson : onShowProgress}
          aria-label={showingProgress ? 'Return to lesson' : 'View detailed progress'}
          aria-current={showingProgress ? 'page' : undefined}
        >
          <span className="progress-nav-icon" aria-hidden="true">{showingProgress ? '←' : '◎'}</span>
          <span className="progress-nav-label">{showingProgress ? 'Lesson' : 'Progress'}</span>
        </button>
      </div>
    </header>
  )
}
