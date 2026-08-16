import { useState } from 'react'
import './styles/app.css'
import { ProgressHeader } from './components/layout/ProgressHeader'
import { FeedbackPanel } from './components/lesson/FeedbackPanel'
import { LetterCard } from './components/lesson/LetterCard'
import { MultipleChoice } from './components/lesson/MultipleChoice'
import { SessionComplete } from './components/lesson/SessionComplete'
import { TypedAnswer } from './components/lesson/TypedAnswer'
import { ProgressScreen } from './components/progress/ProgressScreen'
import { useLearningSession } from './hooks/useLearningSession'
import { useTheme } from './hooks/useTheme'

type AppView = 'lesson' | 'progress'

function App() {
  const session = useLearningSession()
  const { theme, toggleTheme } = useTheme()
  const [activeView, setActiveView] = useState<AppView>('lesson')
  const revealed = session.phase === 'feedback'

  const handleReset = () => {
    if (window.confirm('Reset all Cyrillic learning progress? This cannot be undone.')) {
      session.resetSession()
    }
  }

  return (
    <div className="app-shell">
      <ProgressHeader
        progress={session.progress}
        activeView={activeView}
        onShowLesson={() => setActiveView('lesson')}
        onShowProgress={() => setActiveView('progress')}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {activeView === 'progress' ? (
        <main className="progress-layout" id="progress">
          <ProgressScreen
            progress={session.progress}
            onBack={() => setActiveView('lesson')}
          />
        </main>
      ) : (
        <main className="lesson-layout" id="lesson">
          {session.currentLetter && session.currentProgress ? (
            <>
              <LetterCard
                letter={session.currentLetter}
                mode={session.answerMode}
                level={session.currentProgress.level}
                revealTranslations={revealed}
              >
                {session.answerMode === 'choice' ? (
                  <MultipleChoice
                    choices={session.choices}
                    correctLetterId={session.currentLetter.id}
                    selectedChoiceId={session.selectedChoiceId}
                    revealed={revealed}
                    onChoose={session.chooseAnswer}
                  />
                ) : (
                  <TypedAnswer
                    value={session.typedAnswer}
                    revealed={revealed}
                    onChange={session.setTypedAnswer}
                    onConfirm={session.confirmTypedAnswer}
                  />
                )}

                {session.result ? (
                  <FeedbackPanel
                    result={session.result}
                    letter={session.currentLetter}
                    onContinue={session.continueSession}
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
            <SessionComplete progress={session.progress} onPractice={session.startPractice} />
          )}
        </main>
      )}

      <footer className="app-footer">
        <span>Progress is saved on this device.</span>
        <button type="button" onClick={handleReset}>Reset progress</button>
      </footer>
    </div>
  )
}

export default App
