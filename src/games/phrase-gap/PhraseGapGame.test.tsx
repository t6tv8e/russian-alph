import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PHRASE_GAPS } from './content'
import { PhraseGapGame } from './PhraseGapGame'
import { createPhraseGapProgress } from './progress'
import { PHRASE_GAP_STORAGE_KEY } from './storage'

function installRussianSpeech() {
  const speak = vi.fn()
  const speechSynthesis = {
    addEventListener: vi.fn(),
    cancel: vi.fn(),
    getVoices: () => [{ lang: 'ru-RU', name: 'Russian' } as SpeechSynthesisVoice],
    removeEventListener: vi.fn(),
    speak,
  }
  class TestUtterance {
    lang = ''
    onend: (() => void) | null = null
    onerror: (() => void) | null = null
    rate = 1
    text: string
    voice: SpeechSynthesisVoice | null = null
    constructor(text: string) { this.text = text }
  }
  vi.stubGlobal('speechSynthesis', speechSynthesis)
  vi.stubGlobal('SpeechSynthesisUtterance', TestUtterance)
  return speak
}

function storeAtLevel(level: number) {
  const progress = createPhraseGapProgress(PHRASE_GAPS, 1)
  progress.items['pg-01'] = {
    ...progress.items['pg-01'],
    level,
    attempts: Math.max(1, level),
    correctAttempts: Math.max(1, level),
    lastReviewedAt: 1,
    nextDueAt: 0,
    lastResult: 'correct',
  }
  window.localStorage.setItem(PHRASE_GAP_STORAGE_KEY, JSON.stringify(progress))
}

describe('PhraseGapGame', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('completes a choice happy path, reveals support, and never leaks audio before grading', async () => {
    const user = userEvent.setup()
    const speak = installRussianSpeech()
    render(<PhraseGapGame onExit={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Play completed Russian sentence' })).not.toBeInTheDocument()
    const correct = screen.getByRole('button', { name: /дом/u })
    await user.click(correct)

    expect(screen.getByRole('status')).toHaveTextContent('Это дом. — This is a house.')
    expect(screen.getByRole('status')).toHaveTextContent('dom')
    expect(screen.getByRole('button', { name: 'Continue →' })).toHaveFocus()
    expect(screen.queryByRole('textbox', { hidden: true })).not.toBeInTheDocument()
    expect(speak).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Play completed Russian sentence' }))
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0][0]).toMatchObject({ text: 'Это дом.', lang: 'ru-RU' })
  })

  it('marks an incorrect choice and persists the miss immediately', async () => {
    const user = userEvent.setup()
    installRussianSpeech()
    window.localStorage.setItem('another-game-progress', 'keep')
    render(<PhraseGapGame onExit={vi.fn()} />)

    const wrong = screen.getByRole('button', { name: /книга/u })
    await user.click(wrong)

    expect(wrong).toHaveClass('phrase-gap__choice--incorrect')
    expect(screen.getByRole('button', { name: /дом/u })).toHaveClass('phrase-gap__choice--correct')
    expect(screen.getByRole('status')).toHaveTextContent('The complete answer is Это дом.')
    expect(screen.getByRole('status')).toHaveTextContent('It will return soon.')
    const stored = JSON.parse(window.localStorage.getItem(PHRASE_GAP_STORAGE_KEY) ?? '{}')
    expect(stored.items['pg-01']).toMatchObject({ attempts: 1, lapses: 1, lastResult: 'incorrect' })
    expect(stored.items['pg-01'].nextDueAt).toBe(stored.items['pg-01'].lastReviewedAt)
    expect(window.localStorage.getItem('another-game-progress')).toBe('keep')
  })

  it('uses A–D, focuses the first answer, keeps level-2 feedback in choice mode, and exits with Escape', async () => {
    const user = userEvent.setup()
    const onExit = vi.fn()
    installRussianSpeech()
    storeAtLevel(2)
    render(<PhraseGapGame onExit={onExit} />)

    const answer = screen.getByRole('button', { name: /дом/u })
    expect(screen.getAllByRole('button').find((button) => button.getAttribute('aria-keyshortcuts') === 'A')).toHaveFocus()
    await user.keyboard(answer.getAttribute('aria-keyshortcuts')!)
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
    expect(screen.getAllByText('дом').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Missing word in Cyrillic or Latin')).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('switches to typed recall at level 3 and accepts Latin input', async () => {
    const user = userEvent.setup()
    installRussianSpeech()
    storeAtLevel(3)
    render(<PhraseGapGame onExit={vi.fn()} />)

    const input = screen.getByLabelText('Missing word in Cyrillic or Latin')
    expect(input).toHaveFocus()
    expect(screen.queryByRole('button', { name: /книга/u })).not.toBeInTheDocument()
    await user.type(input, ' DOM. ')
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })

  it('shows the exact typed correction for a near miss', async () => {
    const user = userEvent.setup()
    installRussianSpeech()
    storeAtLevel(3)
    render(<PhraseGapGame onExit={vi.fn()} />)

    await user.type(screen.getByLabelText('Missing word in Cyrillic or Latin'), 'дома')
    await user.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByRole('status')).toHaveTextContent('The missing word is дом (dom).')
    expect(screen.getByRole('status')).toHaveTextContent('It will return soon.')
  })

  it('offers weakest-gap practice after scheduled completion', async () => {
    const user = userEvent.setup()
    installRussianSpeech()
    const now = Date.now()
    const progress = createPhraseGapProgress(PHRASE_GAPS, now)
    for (const item of PHRASE_GAPS) {
      progress.items[item.id] = {
        ...progress.items[item.id], level: 4, attempts: 4, correctAttempts: 4,
        lastReviewedAt: now, nextDueAt: now + 86_400_000, lastResult: 'correct',
      }
    }
    progress.items['pg-07'] = { ...progress.items['pg-07'], level: 1, correctAttempts: 1 }
    window.localStorage.setItem(PHRASE_GAP_STORAGE_KEY, JSON.stringify(progress))

    render(<PhraseGapGame onExit={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Phrase Gap complete' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Practice weakest items' }))
    expect(screen.getByText('This is a new school.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finish practice' })).toBeInTheDocument()
  })
})
