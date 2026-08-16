interface AudioButtonProps {
  label: string
  active: boolean
  disabled: boolean
  onPlay: () => void
  unavailableReason?: string | null
  variant?: 'default' | 'compact'
}

export function AudioButton({
  label,
  active,
  disabled,
  onPlay,
  unavailableReason,
  variant = 'default',
}: AudioButtonProps) {
  return (
    <button
      className={`audio-button audio-button--${variant}${active ? ' audio-button--active' : ''}`}
      type="button"
      onClick={onPlay}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={disabled && unavailableReason ? unavailableReason : label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4H4Z" />
        <path className="audio-wave" d="M15 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
      </svg>
    </button>
  )
}
