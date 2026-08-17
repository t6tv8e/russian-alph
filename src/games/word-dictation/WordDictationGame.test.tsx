import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VOCABULARY } from '../../data/vocabulary'
import { WordDictationGame } from './WordDictationGame'
import {
  createWordDictationProgress,
  WORD_DICTATION_STORAGE_KEY,
} from './logic'

function installRussianSpeech(hasRussianVoice = true) {
  const speak = vi.fn()
  const speechSynthesis = {
    addEventListener: vi.fn(),
    cancel: vi.fn(),
    getVoices: () => [{
      lang: hasRussianVoice ? 'ru-RU' : 'en-US',
      name: hasRussianVoice ? 'Russian' : 'English',
    } as SpeechSynthesisVoice],
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
  return { speak }
}

function addLetter(letter: string) {
  const buttons = document.querySelectorAll<HTMLButtonElement>(
    `button[aria-label="Add Cyrillic letter ${letter}"]`,
  )
  const button = [...buttons].find((candidate) => !candidate.disabled)
  expect(button).toBeDefined()
  fireEvent.click(button!)
}

describe('WordDictationGame', () => {
  beforeEach(() => {
    window.localStorage.removeItem(WORD_DICTATION_STORAGE_KEY)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not autoplay, locks answers, and supports L, repeated tiles, Backspace, and Enter', () => {
    const { speak } = installRussianSpeech()
    render(<WordDictationGame onExit={vi.fn()} />)

    expect(speak).not.toHaveBeenCalled()
    expect(document.querySelector<HTMLButtonElement>('button[aria-label="Add Cyrillic letter м"]')).toBeDisabled()
    expect(screen.getByText('Sounds like:')).toHaveTextContent('mama')

    fireEvent.keyDown(window, { key: 'l' })
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0][0]).toMatchObject({ text: 'мама', lang: 'ru-RU', rate: 0.82 })

    addLetter('м')
    addLetter('а')
    addLetter('м')
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(document.querySelector('button[aria-label="Remove letter м from position 3"]')).toBeNull()
    addLetter('м')
    addLetter('а')
    fireEvent.keyDown(window, { key: 'Enter' })

    expect(screen.getByRole('status')).toHaveTextContent('мама · mama means mother.')
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus()
  })

  it('shows complete incorrect feedback, persists once, and keeps answer controls disabled', async () => {
    installRussianSpeech()
    render(<WordDictationGame onExit={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Play word' }))
    addLetter('п')
    addLetter('а')
    addLetter('м')
    addLetter('а')
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('You built: пама')
    expect(status).toHaveTextContent('The complete correct answer is мама · mama, meaning mother.')
    expect(status).toHaveTextContent('This word will return soon.')
    expect(screen.getByRole('button', { name: 'Replay word' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(WORD_DICTATION_STORAGE_KEY) ?? '{}')
      expect(stored.version).toBe(1)
      expect(stored.items.mama).toMatchObject({
        attempts: 1,
        correctAttempts: 0,
        level: 0,
        lastResult: 'incorrect',
      })
      expect(stored.session.phase).toBe('feedback')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    const stored = JSON.parse(window.localStorage.getItem(WORD_DICTATION_STORAGE_KEY) ?? '{}')
    expect(stored.items.mama.attempts).toBe(1)
  })

  it('renders a non-gradable unavailable state without revealing the target', async () => {
    const onExit = vi.fn()
    installRussianSpeech(false)
    render(<WordDictationGame onExit={onExit} />)

    expect(await screen.findByRole('heading', { name: 'Russian speech is required' })).toBeTruthy()
    expect(screen.queryByText('мама')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull()
    expect(screen.getByText(/Install or enable a Russian system voice/)).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem(WORD_DICTATION_STORAGE_KEY)).not.toContain('"attempts":1')
  })

  it('offers weakest-word practice from accessible completion', async () => {
    installRussianSpeech()
    const now = Date.now()
    const progress = createWordDictationProgress(VOCABULARY, now)
    for (const word of VOCABULARY) {
      progress.items[word.id] = {
        level: word.id === 'mama' ? 1 : 3,
        attempts: 2,
        correctAttempts: word.id === 'mama' ? 1 : 2,
        lastReviewedAt: now,
        nextDueAt: now + 60_000,
        lastResult: 'correct',
      }
    }
    progress.session.currentId = null
    window.localStorage.setItem(WORD_DICTATION_STORAGE_KEY, JSON.stringify(progress))

    render(<WordDictationGame onExit={vi.fn()} />)
    const practice = await screen.findByRole('button', { name: 'Practice weakest items' })
    await waitFor(() => expect(practice).toHaveFocus())
    fireEvent.click(practice)
    expect(screen.getByRole('heading', { name: 'Listen, then spell the word.' })).toBeTruthy()
    expect(screen.getByText('Sounds like:')).toHaveTextContent('mama')
  })
})
