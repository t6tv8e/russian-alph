import type { RussianSpeechController } from '../../hooks/useRussianSpeech'
import type { CyrillicLetter } from '../../learning/types'
import { AudioButton } from '../common/AudioButton'

interface PronunciationGuideProps {
  letter: CyrillicLetter
  speech: RussianSpeechController
}

export function PronunciationGuide({ letter, speech }: PronunciationGuideProps) {
  const speechId = `letter-${letter.id}`

  return (
    <section className="pronunciation-guide" aria-label={`How to pronounce ${letter.uppercase}`}>
      <AudioButton
        label={`Play the Russian name of ${letter.uppercase}`}
        active={speech.speakingId === speechId}
        disabled={!speech.canSpeak}
        unavailableReason={speech.unavailableReason}
        onPlay={() => speech.speak(letter.spokenName, speechId)}
      />
      <div className="pronunciation-copy">
        <div>
          <span className="pronunciation-label">How it sounds</span>
          <span className="ipa-label">{letter.ipa}</span>
        </div>
        <p>{letter.pronunciation}</p>
      </div>
    </section>
  )
}
