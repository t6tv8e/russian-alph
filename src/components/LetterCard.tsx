import type { AnswerMode, CyrillicLetter } from '../learning/types'
import type { ReactNode } from 'react'

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

        <div className="example-list" aria-label="Russian example words in uppercase">
          {letter.examples.map((example) => {
            const uppercaseWord = example.russian.toLocaleUpperCase('ru')

            return (
              <div className="example" key={example.russian}>
                <span className="printed-word" lang="ru" aria-label={uppercaseWord}>
                  {Array.from(uppercaseWord).map((character, index) => (
                    <span
                      className={character === letter.uppercase ? 'target-character' : undefined}
                      key={`${character}-${index}`}
                    >
                      {character}
                    </span>
                  ))}
                </span>
                {revealTranslations ? (
                  <span className="word-details">
                    <span className="word-latin">{example.latin}</span>
                    <span className="word-separator" aria-hidden="true">·</span>
                    <span className="word-translation">{example.english}</span>
                  </span>
                ) : (
                  <span className="translation-placeholder" aria-hidden="true">transliteration and translation after answer</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="answer-area">{children}</div>
    </article>
  )
}
