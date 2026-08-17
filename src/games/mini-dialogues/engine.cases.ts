import { describe, expect, it } from 'vitest'
import { MINI_DIALOGUES } from './content'
import {
  buildDialogueChoices,
  createMiniDialoguesProgress,
  getDialogueScaffolds,
  gradeDialogueChoice,
  hydrateMiniDialoguesProgress,
  MINI_DIALOGUES_INTERVALS,
  recordDialogueAnswer,
  selectNextDialogueId,
  selectWeakestDialogueId,
} from './engine'

describe('Mini Dialogues choice and grading', () => {
  it('builds four unique Russian options with injectable shuffling', () => {
    const choices = buildDialogueChoices(MINI_DIALOGUES[0], () => 0)
    expect(choices).toHaveLength(4)
    expect(new Set(choices.map(({ text }) => text)).size).toBe(4)
    expect(choices.map(({ text }) => text)).toContain(MINI_DIALOGUES[0].reply)
    expect(gradeDialogueChoice(MINI_DIALOGUES[0], 'Привет!')).toBe(true)
    expect(gradeDialogueChoice(MINI_DIALOGUES[0], 'Здравствуйте!')).toBe(false)
  })

  it('fades prompt scaffolds at the exact authored levels', () => {
    expect([0, 1, 2, 3, 4, 5].map(getDialogueScaffolds)).toEqual([
      { showPromptLatin: true, showPromptEnglish: true },
      { showPromptLatin: true, showPromptEnglish: true },
      { showPromptLatin: false, showPromptEnglish: true },
      { showPromptLatin: false, showPromptEnglish: true },
      { showPromptLatin: false, showPromptEnglish: false },
      { showPromptLatin: false, showPromptEnglish: false },
    ])
  })
})

describe('Mini Dialogues scheduling and hydration', () => {
  it('spaces correct answers and makes misses immediately due', () => {
    const now = 10_000
    let progress = createMiniDialoguesProgress(MINI_DIALOGUES, now)
    progress = recordDialogueAnswer(progress, 'md-01', true, now)
    expect(progress.items['md-01']).toMatchObject({ level: 1, nextDueAt: now, attempts: 1 })
    progress = recordDialogueAnswer(progress, 'md-01', true, now + 1)
    expect(progress.items['md-01'].nextDueAt).toBe(now + 1 + MINI_DIALOGUES_INTERVALS[2])
    progress = recordDialogueAnswer(progress, 'md-01', false, now + 2)
    expect(progress.items['md-01']).toMatchObject({ level: 1, nextDueAt: now + 2, lastResult: 'incorrect', lapses: 1 })
  })

  it('prioritizes missed due dialogues, respects the two-item gap, and interleaves settings', () => {
    const now = 20_000
    let progress = createMiniDialoguesProgress(MINI_DIALOGUES, now)
    progress = recordDialogueAnswer(progress, 'md-01', false, now)
    expect(selectNextDialogueId(MINI_DIALOGUES, progress, now, ['md-01'])).toBe('md-02')
    progress = recordDialogueAnswer(progress, 'md-02', true, now)
    expect(selectNextDialogueId(MINI_DIALOGUES, progress, now, ['md-01', 'md-02'])).toBe('md-03')
    progress = recordDialogueAnswer(progress, 'md-03', true, now)
    expect(selectNextDialogueId(MINI_DIALOGUES, progress, now, ['md-02', 'md-03'])).toBe('md-01')

    const introductions = createMiniDialoguesProgress(MINI_DIALOGUES, now)
    introductions.items['md-01'].attempts = 1
    introductions.items['md-01'].nextDueAt = now + 1
    introductions.items['md-02'].attempts = 1
    introductions.items['md-02'].nextDueAt = now + 1
    introductions.items['md-03'].attempts = 1
    introductions.items['md-03'].nextDueAt = now + 1
    introductions.items['md-04'].attempts = 1
    introductions.items['md-04'].nextDueAt = now + 1
    expect(selectNextDialogueId(MINI_DIALOGUES, introductions, now, ['md-04'])).toBe('md-06')
  })

  it('repairs malformed known items, adds content, and ignores unknown IDs', () => {
    const now = 30_000
    const stored = createMiniDialoguesProgress(MINI_DIALOGUES, now)
    stored.items['md-01'] = recordDialogueAnswer(stored, 'md-01', true, now).items['md-01']
    stored.items['md-02'] = { ...stored.items['md-02'], level: 9 }
    stored.items.removed = { ...stored.items['md-03'] }
    const hydrated = hydrateMiniDialoguesProgress(stored, MINI_DIALOGUES, now + 1)
    expect(Object.keys(hydrated.items)).toEqual(MINI_DIALOGUES.map(({ id }) => id))
    expect(hydrated.items['md-01'].attempts).toBe(1)
    expect(hydrated.items['md-02'].attempts).toBe(0)
    expect(hydrateMiniDialoguesProgress({ ...stored, version: 2 }, MINI_DIALOGUES, now).items['md-01'].attempts).toBe(0)
  })

  it('selects weakest practice by level, accuracy, lapses, then oldest review', () => {
    const now = 40_000
    let progress = createMiniDialoguesProgress(MINI_DIALOGUES, now)
    progress = recordDialogueAnswer(progress, 'md-01', true, now)
    progress = recordDialogueAnswer(progress, 'md-02', false, now + 1)
    expect(selectWeakestDialogueId(MINI_DIALOGUES, progress)).toBe('md-02')
  })
})
