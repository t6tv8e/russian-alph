import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SENTENCE_BUILDER_SENTENCES } from './content'
import { SentenceBuilderGame } from './SentenceBuilderGame'
import { createSentenceBuilderProgress, SENTENCE_BUILDER_STORAGE_KEY } from './logic'

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

function storedAtLevel(level: number) {
  const progress = createSentenceBuilderProgress(SENTENCE_BUILDER_SENTENCES)
  progress.items['sb-01'] = { ...progress.items['sb-01'], level, attempts: Math.max(1, level), correctAttempts: Math.max(1, level), nextDueAt: 0, lastResult: 'correct' }
  window.localStorage.setItem(SENTENCE_BUILDER_STORAGE_KEY, JSON.stringify(progress))
}

describe('SentenceBuilderGame', () => {
  beforeEach(() => window.localStorage.removeItem(SENTENCE_BUILDER_STORAGE_KEY))
  afterEach(() => vi.unstubAllGlobals())

  it('builds the sentence with buttons, keeps punctuation fixed, and gives exact feedback', async () => {
    const user = userEvent.setup()
    render(<SentenceBuilderGame onExit={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Sentence Builder' })).toBeTruthy()
    expect(screen.getByText('Sounds like: Eto dom.')).toBeTruthy()
    expect(screen.getByLabelText('Fixed final period')).toHaveTextContent('.')
    expect(screen.queryByRole('button', { name: /period/i })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Add Это to answer' }))
    await user.click(screen.getByRole('button', { name: 'Add дом to answer' }))
    fireEvent.keyDown(window, { key: 'Enter' })

    expect(screen.getByRole('status')).toHaveTextContent('Это дом. · Eto dom. means This is a house.')
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus()
  })

  it('shows complete corrective feedback, persists immediately, and restores feedback after exit', async () => {
    const user = userEvent.setup()
    const onExit = vi.fn()
    const view = render(<SentenceBuilderGame onExit={onExit} />)
    await user.click(screen.getByRole('button', { name: 'Add дом to answer' }))
    await user.click(screen.getByRole('button', { name: 'Add Это to answer' }))
    await user.click(screen.getByRole('button', { name: 'Check' }))

    expect(screen.getByRole('status')).toHaveTextContent('Your answer: дом Это.')
    expect(screen.getByRole('status')).toHaveTextContent('Russian word order for this prompt is: Это дом.')
    expect(screen.getByRole('status')).toHaveTextContent('This sentence will return soon.')
    const stored = JSON.parse(window.localStorage.getItem(SENTENCE_BUILDER_STORAGE_KEY) ?? '{}')
    expect(stored.items['sb-01']).toMatchObject({ attempts: 1, lapses: 1, nextDueAt: expect.any(Number), lastResult: 'incorrect' })

    await user.keyboard('{Escape}')
    expect(onExit).toHaveBeenCalledTimes(1)
    view.unmount()
    render(<SentenceBuilderGame onExit={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Russian word order for this prompt is: Это дом.')
  })

  it('fades scaffolds, allows a high-level distractor to remain unused, and supports keyboard Undo', async () => {
    const user = userEvent.setup()
    storedAtLevel(4)
    render(<SentenceBuilderGame onExit={vi.fn()} />)

    expect(screen.queryByText(/Sounds like:/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Add книга to answer' })).toBeTruthy()
    const first = screen.getByRole('button', { name: 'Add Это to answer' })
    first.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Remove Это from answer' })).toBeTruthy()
    await user.keyboard('{Backspace}')
    expect(screen.queryByRole('button', { name: 'Remove Это from answer' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Add Это to answer' }))
    await user.click(screen.getByRole('button', { name: 'Add дом to answer' }))
    expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Add книга to answer' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByRole('status')).toHaveTextContent('Это дом.')
  })

  it('plays the full Russian sentence only after grading', async () => {
    const user = userEvent.setup()
    const speak = installRussianSpeech()
    render(<SentenceBuilderGame onExit={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Play sentence' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Add Это to answer' }))
    await user.click(screen.getByRole('button', { name: 'Add дом to answer' }))
    await user.click(screen.getByRole('button', { name: 'Check' }))
    await user.click(screen.getByRole('button', { name: 'Play sentence' }))
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0][0]).toMatchObject({ text: 'Это дом.', lang: 'ru-RU' })
  })

  it('offers weakest-sentence practice from an accessible completion screen', async () => {
    const user = userEvent.setup()
    const now = Date.now()
    const progress = createSentenceBuilderProgress(SENTENCE_BUILDER_SENTENCES, now)
    for (const sentence of SENTENCE_BUILDER_SENTENCES) {
      progress.items[sentence.id] = { ...progress.items[sentence.id], level: 2, attempts: 2, correctAttempts: 2, lastReviewedAt: now, nextDueAt: now + 600_000, lastResult: 'correct' }
    }
    progress.items['sb-12'] = { ...progress.items['sb-12'], level: 1, attempts: 3, correctAttempts: 1, lapses: 2 }
    window.localStorage.setItem(SENTENCE_BUILDER_STORAGE_KEY, JSON.stringify(progress))
    render(<SentenceBuilderGame onExit={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Scheduled round complete' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Practice weakest items' }))
    expect(screen.getByText('This is a quiet street.')).toBeTruthy()
    expect(screen.getByText('Weakest-sentence practice')).toBeTruthy()
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(SENTENCE_BUILDER_STORAGE_KEY) ?? '{}').session.practiceMode).toBe(true))
  })
})
