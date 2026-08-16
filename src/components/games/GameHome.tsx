import { ALPHABET } from '../../data/alphabet'
import { VOCABULARY } from '../../data/vocabulary'
import {
  getMasteredCount,
  getOverallProgress,
} from '../../learning/scheduler'
import type { LearningProgress } from '../../learning/types'
import {
  getVocabularyMasteredCount,
  getVocabularyOverallProgress,
} from '../../learning/vocabulary'
import type { VocabularyProgress } from '../../learning/vocabularyTypes'

interface GameHomeProps {
  alphabetProgress: LearningProgress
  vocabularyProgress: VocabularyProgress
  onPlayAlphabet: () => void
  onPlayWordMatch: () => void
  onPlayListenPick: () => void
}

interface GameProgressProps {
  value: number
  label: string
}

function GameProgress({ value, label }: GameProgressProps) {
  return (
    <div className="game-card-progress">
      <div className="game-card-progress-copy">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <span className="progress-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export function GameHome({
  alphabetProgress,
  vocabularyProgress,
  onPlayAlphabet,
  onPlayWordMatch,
  onPlayListenPick,
}: GameHomeProps) {
  const alphabetOverall = getOverallProgress(alphabetProgress)
  const alphabetMastered = getMasteredCount(alphabetProgress)
  const vocabularyOverall = getVocabularyOverallProgress(vocabularyProgress)
  const vocabularyMastered = getVocabularyMasteredCount(vocabularyProgress)

  return (
    <main className="games-home" id="games">
      <section className="games-hero" aria-labelledby="games-title">
        <p className="section-kicker">Choose your practice</p>
        <h1 id="games-title">What do you want to train?</h1>
        <p>
          Each game targets a different skill. Your progress is saved separately, so switch whenever you like.
        </p>
      </section>

      <section className="game-grid" aria-label="Available language games">
        <article className="game-card game-card--alphabet">
          <div className="game-card-icon" aria-hidden="true">Я</div>
          <div className="game-card-copy">
            <div className="game-card-topline">
              <p className="game-card-kicker">Letters · Recognition</p>
              <span className="game-status">Available</span>
            </div>
            <h2>Alphabet Trainer</h2>
            <p>Learn all 33 Cyrillic letters with examples, pronunciation, and typed recall.</p>
            <ul className="strategy-list" aria-label="Learning strategies">
              <li>Spaced repetition</li>
              <li>Typed retrieval</li>
            </ul>
          </div>
          <GameProgress
            value={alphabetOverall}
            label={`${alphabetMastered} of ${ALPHABET.length} letters mastered`}
          />
          <button type="button" className="game-play-button" onClick={onPlayAlphabet}>
            Play Alphabet Trainer
            <span aria-hidden="true">→</span>
          </button>
        </article>

        <article className="game-card game-card--words">
          <div className="game-card-icon" aria-hidden="true">дом</div>
          <div className="game-card-copy">
            <div className="game-card-topline">
              <p className="game-card-kicker">Words · Meaning</p>
              <span className="game-status game-status--new">New</span>
            </div>
            <h2>Word Match</h2>
            <p>Decode useful Russian words, listen to them, and retrieve their English meanings.</p>
            <ul className="strategy-list" aria-label="Learning strategies">
              <li>Meaning retrieval</li>
              <li>Immediate feedback</li>
            </ul>
          </div>
          <GameProgress
            value={vocabularyOverall}
            label={`${vocabularyMastered} of ${VOCABULARY.length} words mastered`}
          />
          <button type="button" className="game-play-button" onClick={onPlayWordMatch}>
            Play Word Match
            <span aria-hidden="true">→</span>
          </button>
        </article>

        <article className="game-card game-card--listening">
          <div className="game-card-icon" aria-hidden="true">♪</div>
          <div className="game-card-copy">
            <div className="game-card-topline">
              <p className="game-card-kicker">Sounds · Listening</p>
              <span className="game-status game-status--new">New</span>
            </div>
            <h2>Listen &amp; Pick</h2>
            <p>Hear a Russian letter name and choose the matching Cyrillic character.</p>
            <ul className="strategy-list" aria-label="Learning strategies">
              <li>Sound–symbol mapping</li>
              <li>Confusable contrasts</li>
            </ul>
          </div>
          <div className="game-card-progress game-card-progress--copy">
            <span>All 33 letter sounds are ready to practise.</span>
          </div>
          <button type="button" className="game-play-button" onClick={onPlayListenPick}>
            Play Listen &amp; Pick
            <span aria-hidden="true">→</span>
          </button>
        </article>
      </section>

      <aside className="home-learning-note" aria-label="Learning guidance">
        <span aria-hidden="true">✦</span>
        <p><strong>Short, varied sessions work best.</strong> Try one game for five minutes, then return when reviews are due.</p>
      </aside>
    </main>
  )
}
