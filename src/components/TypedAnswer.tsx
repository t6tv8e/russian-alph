import { useEffect, useRef } from 'react'
import type { FormEvent } from 'react'

interface TypedAnswerProps {
  value: string
  revealed: boolean
  onChange: (value: string) => void
  onConfirm: () => void
}

export function TypedAnswer({
  value,
  revealed,
  onChange,
  onConfirm,
}: TypedAnswerProps) {
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
      <label htmlFor="latin-answer">Type the Latin equivalent</label>
      <div className="typed-answer-row">
        <input
          ref={inputRef}
          id="latin-answer"
          name="latin-answer"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Type your answer…"
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
