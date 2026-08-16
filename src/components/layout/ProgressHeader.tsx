import type { Theme } from '../../hooks/useTheme'
import { ThemeToggle } from '../common/ThemeToggle'

export type AppSection = 'games' | 'alphabet' | 'words' | 'listening' | 'progress'

export interface HeaderProgressSummary {
  value: number
  label: string
  detail: string
  ariaLabel: string
}

interface ProgressHeaderProps {
  summary: HeaderProgressSummary | null
  activeView: AppSection
  onShowGames: () => void
  onShowAlphabet: () => void
  onShowProgress: () => void
  theme: Theme
  onToggleTheme: () => void
}

export function ProgressHeader({
  summary,
  activeView,
  onShowGames,
  onShowAlphabet,
  onShowProgress,
  theme,
  onToggleTheme,
}: ProgressHeaderProps) {
  const showingProgress = activeView === 'progress'
  const showAlphabetNavigation = activeView === 'alphabet' || showingProgress

  return (
    <header className="app-header">
      <button
        className="brand brand-button"
        type="button"
        onClick={onShowGames}
        aria-label="Быстро Буквы home"
      >
        <span className="brand-mark" aria-hidden="true">Я</span>
        <span className="brand-copy">
          <strong>Быстро Буквы</strong>
          <small>Russian, one skill at a time</small>
        </span>
      </button>

      <div className="header-progress">
        {summary ? (
          <div className="progress-summary" aria-label={summary.ariaLabel}>
            <div className="progress-copy">
              <span>{summary.label}</span>
              <span>{summary.detail}</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={summary.value}
            >
              <span className="progress-fill" style={{ width: `${summary.value}%` }} />
            </div>
          </div>
        ) : null}

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        {activeView !== 'games' ? (
          <button
            className="progress-nav-button"
            type="button"
            onClick={onShowGames}
            aria-label="Choose a game"
          >
            <span className="progress-nav-icon" aria-hidden="true">⌂</span>
            <span className="progress-nav-label">Games</span>
          </button>
        ) : null}

        {showAlphabetNavigation ? (
          <button
            className="progress-nav-button"
            type="button"
            onClick={showingProgress ? onShowAlphabet : onShowProgress}
            aria-label={showingProgress ? 'Return to lesson' : 'View detailed progress'}
            aria-current={showingProgress ? 'page' : undefined}
          >
            <span className="progress-nav-icon" aria-hidden="true">{showingProgress ? '←' : '◎'}</span>
            <span className="progress-nav-label">{showingProgress ? 'Lesson' : 'Progress'}</span>
          </button>
        ) : null}
      </div>
    </header>
  )
}
