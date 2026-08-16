import type { Choice } from '../learning/types'

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
