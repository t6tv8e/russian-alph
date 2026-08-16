import type { RussianSpeechController } from '../../hooks/useRussianSpeech'
import type { WordExample } from '../../learning/types'
import { AudioButton } from '../common/AudioButton'

interface ExampleWordProps {
  example: WordExample
  targetCharacter: string
  revealDetails: boolean
  speech: RussianSpeechController
}

export function ExampleWord({
  example,
  targetCharacter,
  revealDetails,
  speech,
}: ExampleWordProps) {
  const uppercaseWord = example.russian.toLocaleUpperCase('ru')
  const speechId = `word-${example.russian}`

  return (
    <div className="example">
      <AudioButton
        label={`Play pronunciation of ${example.russian}`}
        active={speech.speakingId === speechId}
        disabled={!speech.canSpeak}
        unavailableReason={speech.unavailableReason}
        onPlay={() => speech.speak(example.russian, speechId)}
        variant="compact"
      />
      <span className="printed-word" lang="ru" aria-label={uppercaseWord}>
        {Array.from(uppercaseWord).map((character, index) => (
          <span
            className={character === targetCharacter ? 'target-character' : undefined}
            key={`${character}-${index}`}
          >
            {character}
          </span>
        ))}
      </span>
      {revealDetails ? (
        <span className="word-details">
          <span className="word-latin">{example.latin}</span>
          <span className="word-separator" aria-hidden="true">·</span>
          <span className="word-translation">{example.english}</span>
        </span>
      ) : (
        <span className="translation-placeholder" aria-hidden="true">
          transliteration and translation after answer
        </span>
      )}
    </div>
  )
}
