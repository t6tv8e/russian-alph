import { VOCABULARY } from '../../data/vocabulary'
import {
  getVocabularyMasteredCount,
  getVocabularyOverallProgress,
} from '../../learning/vocabulary'
import type { VocabularySessionState } from '../../learning/vocabularyTypes'
import { VocabularyChoices } from './VocabularyChoices'
import { VocabularyComplete } from './VocabularyComplete'
import { VocabularyFeedback } from './VocabularyFeedback'
import { VocabularyTypedAnswer } from './VocabularyTypedAnswer'
import { WordCard } from './WordCard'

interface WordMatchGameProps {
  session: VocabularySessionState
  onExit: () => void
}

export function WordMatchGame({ session, onExit }: WordMatchGameProps) {
  const overall = getVocabularyOverallProgress(session.progress)
  const mastered = getVocabularyMasteredCount(session.progress)
  const revealed = session.phase === 'feedback'

  return (
    <section className="game-screen" aria-labelledby="word-match-title">
      <div className="game-screen-heading">
        <div>
          <p className="section-kicker">Vocabulary game</p>
          <h1 id="word-match-title">Word Match</h1>
          <p>Decode useful Russian words and retrieve their meanings from memory.</p>
        </div>
        <div className="game-screen-actions">
          <span>{mastered}/{VOCABULARY.length} mastered · {overall}%</span>
          <button type="button" className="back-to-lesson" onClick={onExit}>
            <span aria-hidden="true">←</span>
            All games
          </button>
        </div>
      </div>

      <div className="word-game-content">
        {session.currentWord && session.currentProgress ? (
          <>
            <WordCard
              word={session.currentWord}
              mode={session.answerMode}
              level={session.currentProgress.level}
              revealed={revealed}
            >
              {session.answerMode === 'choice' ? (
                <VocabularyChoices
                  choices={session.choices}
                  correctWordId={session.currentWord.id}
                  selectedChoiceId={session.selectedChoiceId}
                  revealed={revealed}
                  onChoose={session.chooseAnswer}
                />
              ) : (
                <VocabularyTypedAnswer
                  value={session.typedAnswer}
                  revealed={revealed}
                  onChange={session.setTypedAnswer}
                  onConfirm={session.confirmTypedAnswer}
                />
              )}

              {session.result ? (
                <VocabularyFeedback
                  result={session.result}
                  word={session.currentWord}
                  onContinue={session.continueSession}
                />
              ) : null}
            </WordCard>

            <aside className="learning-note" aria-label="Learning method">
              <span className="learning-note-icon" aria-hidden="true">↻</span>
              <p>
                <strong>Retrieval that adapts</strong>
                Missed words return sooner. Familiar meanings graduate from choices to typed recall.
              </p>
            </aside>
          </>
        ) : (
          <VocabularyComplete
            progress={session.progress}
            onPractice={session.startPractice}
            onExit={onExit}
          />
        )}
      </div>
    </section>
  )
}
