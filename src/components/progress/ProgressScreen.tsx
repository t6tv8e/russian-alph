import { ALPHABET } from '../../data/alphabet'
import type { LearningProgress } from '../../learning/types'
import { LetterProgressCard } from './LetterProgressCard'
import { ProgressOverview } from './ProgressOverview'

interface ProgressScreenProps {
  progress: LearningProgress
  onBack: () => void
}

export function ProgressScreen({ progress, onBack }: ProgressScreenProps) {
  return (
    <section className="progress-screen" aria-labelledby="progress-title">
      <div className="progress-screen-heading">
        <div>
          <p className="section-kicker">Your learning journey</p>
          <h1 id="progress-title">Your Cyrillic progress</h1>
          <p>Every answer strengthens a letter. Typed recall is the final step toward mastery.</p>
        </div>
        <button type="button" className="back-to-lesson" onClick={onBack}>
          <span aria-hidden="true">←</span>
          Back to lesson
        </button>
      </div>

      <ProgressOverview progress={progress} />

      <div className="alphabet-progress-heading">
        <div>
          <h2>Letter by letter</h2>
          <p>Five filled steps means a letter is mastered.</p>
        </div>
        <div className="progress-legend" aria-label="Progress legend">
          <span><i className="legend-dot legend-dot--learning" />Learning</span>
          <span><i className="legend-dot legend-dot--recall" />Typed recall</span>
          <span><i className="legend-dot legend-dot--mastered" />Mastered</span>
        </div>
      </div>

      <ul className="alphabet-progress-grid" aria-label="Letter progress">
        {ALPHABET.map((letter) => (
          <LetterProgressCard
            letter={letter}
            progress={progress.letters[letter.id]}
            key={letter.id}
          />
        ))}
      </ul>
    </section>
  )
}
