import { useState } from 'react'
import './styles/app.css'
import { GameHome } from './components/games/GameHome'
import { ListenPickGame } from './components/listening'
import {
  ProgressHeader,
  type AppSection,
  type HeaderProgressSummary,
} from './components/layout/ProgressHeader'
import { FeedbackPanel } from './components/lesson/FeedbackPanel'
import { LetterCard } from './components/lesson/LetterCard'
import { MultipleChoice } from './components/lesson/MultipleChoice'
import { SessionComplete } from './components/lesson/SessionComplete'
import { TypedAnswer } from './components/lesson/TypedAnswer'
import { ProgressScreen } from './components/progress/ProgressScreen'
import { WordMatchGame } from './components/vocabulary/WordMatchGame'
import { ALPHABET } from './data/alphabet'
import { VOCABULARY } from './data/vocabulary'
import { MiniDialoguesGame } from './games/mini-dialogues'
import { PhraseGapGame } from './games/phrase-gap'
import { ReadingSprintGame } from './games/reading-sprint'
import { SentenceBuilderGame } from './games/sentence-builder'
import { WordBuilderGame } from './games/word-builder'
import { WordDictationGame } from './games/word-dictation'
import { useLearningSession } from './hooks/useLearningSession'
import { useTheme } from './hooks/useTheme'
import { useVocabularySession } from './hooks/useVocabularySession'
import {
  getMasteredCount,
  getOverallProgress,
  getSessionStats,
} from './learning/scheduler'
import {
  getVocabularyMasteredCount,
  getVocabularyOverallProgress,
  getVocabularyStats,
} from './learning/vocabulary'

function App() {
  const alphabetSession = useLearningSession()
  const vocabularySession = useVocabularySession()
  const { theme, toggleTheme } = useTheme()
  const [activeView, setActiveView] = useState<AppSection>('games')
  const revealed = alphabetSession.phase === 'feedback'

  const alphabetOverall = getOverallProgress(alphabetSession.progress)
  const alphabetMastered = getMasteredCount(alphabetSession.progress)
  const alphabetStats = getSessionStats(alphabetSession.progress)
  const vocabularyOverall = getVocabularyOverallProgress(vocabularySession.progress)
  const vocabularyMastered = getVocabularyMasteredCount(vocabularySession.progress)
  const vocabularyStats = getVocabularyStats(vocabularySession.progress)

  let headerSummary: HeaderProgressSummary | null = null
  if (activeView === 'alphabet' || activeView === 'progress') {
    headerSummary = {
      value: alphabetOverall,
      label: `${alphabetMastered} of ${ALPHABET.length} mastered`,
      detail: alphabetStats.attempts > 0
        ? `${alphabetStats.accuracy}% accuracy`
        : 'Ready to begin',
      ariaLabel: `${alphabetOverall}% alphabet knowledge`,
    }
  } else if (activeView === 'words') {
    headerSummary = {
      value: vocabularyOverall,
      label: `${vocabularyMastered} of ${VOCABULARY.length} mastered`,
      detail: vocabularyStats.attempts > 0
        ? `${vocabularyStats.accuracy}% accuracy`
        : 'Ready to begin',
      ariaLabel: `${vocabularyOverall}% vocabulary knowledge`,
    }
  }

  const handleReset = () => {
    if (activeView === 'words') {
      if (window.confirm('Reset all Word Match progress? This cannot be undone.')) {
        vocabularySession.resetSession()
      }
      return
    }

    if (window.confirm('Reset all Cyrillic learning progress? This cannot be undone.')) {
      alphabetSession.resetSession()
    }
  }

  const showReset = activeView === 'alphabet' || activeView === 'progress' || activeView === 'words'

  return (
    <div className="app-shell">
      <ProgressHeader
        summary={headerSummary}
        activeView={activeView}
        onShowGames={() => setActiveView('games')}
        onShowAlphabet={() => setActiveView('alphabet')}
        onShowProgress={() => setActiveView('progress')}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {activeView === 'games' ? (
        <GameHome
          alphabetProgress={alphabetSession.progress}
          vocabularyProgress={vocabularySession.progress}
          onPlayAlphabet={() => setActiveView('alphabet')}
          onPlayWordMatch={() => setActiveView('words')}
          onPlayListenPick={() => setActiveView('listening')}
          onPlayWordBuilder={() => setActiveView('word-builder')}
          onPlayWordDictation={() => setActiveView('word-dictation')}
          onPlaySentenceBuilder={() => setActiveView('sentence-builder')}
          onPlayPhraseGap={() => setActiveView('phrase-gap')}
          onPlayMiniDialogues={() => setActiveView('mini-dialogues')}
          onPlayReadingSprint={() => setActiveView('reading-sprint')}
        />
      ) : activeView === 'progress' ? (
        <main className="progress-layout" id="progress">
          <ProgressScreen
            progress={alphabetSession.progress}
            onBack={() => setActiveView('alphabet')}
          />
        </main>
      ) : activeView === 'words' ? (
        <main className="game-layout" id="word-match">
          <WordMatchGame
            session={vocabularySession}
            onExit={() => setActiveView('games')}
          />
        </main>
      ) : activeView === 'listening' ? (
        <main id="listen-pick">
          <ListenPickGame onExit={() => setActiveView('games')} />
        </main>
      ) : activeView === 'word-builder' ? (
        <main id="word-builder">
          <WordBuilderGame onExit={() => setActiveView('games')} />
        </main>
      ) : activeView === 'word-dictation' ? (
        <main id="word-dictation">
          <WordDictationGame onExit={() => setActiveView('games')} />
        </main>
      ) : activeView === 'sentence-builder' ? (
        <main id="sentence-builder">
          <SentenceBuilderGame onExit={() => setActiveView('games')} />
        </main>
      ) : activeView === 'phrase-gap' ? (
        <main id="phrase-gap">
          <PhraseGapGame onExit={() => setActiveView('games')} />
        </main>
      ) : activeView === 'mini-dialogues' ? (
        <main id="mini-dialogues">
          <MiniDialoguesGame onExit={() => setActiveView('games')} />
        </main>
      ) : activeView === 'reading-sprint' ? (
        <main id="reading-sprint">
          <ReadingSprintGame onExit={() => setActiveView('games')} />
        </main>
      ) : (
        <main className="lesson-layout" id="lesson">
          {alphabetSession.currentLetter && alphabetSession.currentProgress ? (
            <>
              <LetterCard
                letter={alphabetSession.currentLetter}
                mode={alphabetSession.answerMode}
                level={alphabetSession.currentProgress.level}
                revealTranslations={revealed}
              >
                {alphabetSession.answerMode === 'choice' ? (
                  <MultipleChoice
                    choices={alphabetSession.choices}
                    correctLetterId={alphabetSession.currentLetter.id}
                    selectedChoiceId={alphabetSession.selectedChoiceId}
                    revealed={revealed}
                    onChoose={alphabetSession.chooseAnswer}
                  />
                ) : (
                  <TypedAnswer
                    value={alphabetSession.typedAnswer}
                    revealed={revealed}
                    onChange={alphabetSession.setTypedAnswer}
                    onConfirm={alphabetSession.confirmTypedAnswer}
                  />
                )}

                {alphabetSession.result ? (
                  <FeedbackPanel
                    result={alphabetSession.result}
                    letter={alphabetSession.currentLetter}
                    onContinue={alphabetSession.continueSession}
                  />
                ) : null}
              </LetterCard>

              <aside className="learning-note" aria-label="Learning method">
                <span className="learning-note-icon" aria-hidden="true">↻</span>
                <p>
                  <strong>Smart repetition</strong>
                  Missed letters return sooner. Familiar letters graduate from choices to typed recall.
                </p>
              </aside>
            </>
          ) : (
            <SessionComplete
              progress={alphabetSession.progress}
              onPractice={alphabetSession.startPractice}
            />
          )}
        </main>
      )}

      <footer className="app-footer">
        <span>Progress is saved on this device.</span>
        {showReset ? (
          <button type="button" onClick={handleReset}>
            Reset {activeView === 'words' ? 'word' : 'alphabet'} progress
          </button>
        ) : null}
      </footer>
    </div>
  )
}

export default App
