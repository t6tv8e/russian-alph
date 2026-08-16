import { useEffect } from 'react'
import type { Choice } from '../../learning/types'

interface MultipleChoiceProps {
  choices: Choice[]
  correctLetterId: string
  selectedChoiceId: string | null
  revealed: boolean
  onChoose: (letterId: string) => void
}

const CHOICE_KEYS = ['A', 'B', 'C', 'D']

export function MultipleChoice({
  choices,
  correctLetterId,
  selectedChoiceId,
  revealed,
  onChoose,
}: MultipleChoiceProps) {
  useEffect(() => {
    if (revealed) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) {
        return
      }

      const choiceIndex = CHOICE_KEYS.indexOf(event.key.toUpperCase())
      const choice = choices[choiceIndex]

      if (choiceIndex >= 0 && choice) {
        event.preventDefault()
        onChoose(choice.letterId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [choices, onChoose, revealed])

  return (
    <fieldset className="choice-fieldset">
      <legend>Choose one answer</legend>
      <div className="choice-grid">
        {choices.map((choice, index) => {
          const isCorrect = revealed && choice.letterId === correctLetterId
          const isIncorrect =
            revealed &&
            choice.letterId === selectedChoiceId &&
            choice.letterId !== correctLetterId
          const stateClass = isCorrect
            ? ' choice-button--correct'
            : isIncorrect
              ? ' choice-button--incorrect'
              : ''

          return (
            <button
              className={`choice-button${stateClass}`}
              type="button"
              key={choice.letterId}
              onClick={() => onChoose(choice.letterId)}
              disabled={revealed}
              aria-label={`Choose ${choice.label}`}
              aria-keyshortcuts={CHOICE_KEYS[index]}
            >
              <span className="choice-key" aria-hidden="true">{CHOICE_KEYS[index]}</span>
              <span>{choice.label}</span>
              {isCorrect ? <span className="choice-status" aria-hidden="true">✓</span> : null}
              {isIncorrect ? <span className="choice-status" aria-hidden="true">×</span> : null}
            </button>
          )
        })}
      </div>
      <p className="choice-hint">Tap an answer to check it immediately.</p>
    </fieldset>
  )
}
