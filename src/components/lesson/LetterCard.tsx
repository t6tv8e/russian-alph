import type { ReactNode } from 'react'
import { useRussianSpeech } from '../../hooks/useRussianSpeech'
import type { AnswerMode, CyrillicLetter } from '../../learning/types'
import { ExampleWord } from './ExampleWord'
import { PronunciationGuide } from './PronunciationGuide'

interface LetterCardProps {
  letter: CyrillicLetter
  mode: AnswerMode
  level: number
  revealTranslations: boolean
  children: ReactNode
}

export function LetterCard({
  letter,
  mode,
  level,
  revealTranslations,
  children,
}: LetterCardProps) {
  const speech = useRussianSpeech()

  return (
    <article className="lesson-card">
      <div className="mode-label">
        <span className={`mode-dot mode-dot--${mode}`} aria-hidden="true" />
        {mode === 'choice' ? 'Recognise the letter' : 'Recall from memory'}
        <span aria-hidden="true">·</span>
        Level {Math.min(level + 1, 5)}
      </div>

      <div className="letter-stage">
        <p className="letter-prompt">Which Latin equivalent matches?</p>
        <h1 className="cyrillic-letter" lang="ru" aria-label={`Cyrillic letter ${letter.uppercase}`}>
          {letter.uppercase}
        </h1>

        <PronunciationGuide letter={letter} speech={speech} />

        <div className="example-list" aria-label="Russian example words in uppercase">
          {letter.examples.map((example) => (
            <ExampleWord
              example={example}
              targetCharacter={letter.uppercase}
              revealDetails={revealTranslations}
              speech={speech}
              key={example.russian}
            />
          ))}
        </div>
      </div>

      <div className="answer-area">{children}</div>
    </article>
  )
}
