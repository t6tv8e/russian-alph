import type { Theme } from '../../hooks/useTheme'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const darkModeActive = theme === 'dark'
  const nextTheme = darkModeActive ? 'light' : 'dark'

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={darkModeActive}
      title={`Switch to ${nextTheme} mode`}
    >
      <span aria-hidden="true">{darkModeActive ? '☀' : '☾'}</span>
    </button>
  )
}
