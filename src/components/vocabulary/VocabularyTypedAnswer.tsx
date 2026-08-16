import { useEffect, useRef } from 'react'
import type { FormEvent } from 'react'

interface VocabularyTypedAnswerProps {
  value: string
  revealed: boolean
  onChange: (value: string) => void
  onConfirm: () => void
}

export function VocabularyTypedAnswer({
  value,
  revealed,
  onChange,
  onConfirm,
}: VocabularyTypedAnswerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!revealed) {
      inputRef.current?.focus()
    }
  }, [revealed])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onConfirm()
  }

  return (
    <form className="typed-answer" onSubmit={handleSubmit}>
      <label htmlFor="word-meaning-answer">Type the English meaning</label>
      <div className="typed-answer-row">
        <input
          ref={inputRef}
          id="word-meaning-answer"
          name="word-meaning-answer"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Type the meaning…"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={revealed}
          autoFocus
        />
        <button type="submit" className="confirm-button" disabled={revealed || !value.trim()}>
          Confirm
          <span aria-hidden="true">↵</span>
        </button>
      </div>
      <p className="choice-hint">Press Enter or tap Confirm when you’re ready.</p>
    </form>
  )
}
