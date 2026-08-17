import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VOCABULARY } from '../../data/vocabulary'
import { WordBuilderGame } from './WordBuilderGame'
import {
  createWordBuilderProgress,
  WORD_BUILDER_STORAGE_KEY,
} from './wordBuilder'

function placeWord(value: string) {
  for (const character of value) {
    const tile = screen.getAllByRole('button', { name: `Add ${character}` }).find((button) => !button.hasAttribute('disabled'))
    expect(tile).toBeDefined()
    fireEvent.click(tile!)
  }
}

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
    constructor(text: string) {
      this.text = text
    }
  }
  vi.stubGlobal('speechSynthesis', speechSynthesis)
  vi.stubGlobal('SpeechSynthesisUtterance', TestUtterance)
  return speak
}

describe('WordBuilderGame', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds a repeated-letter word, gives exact feedback, and offers pronunciation', () => {
    const speak = installRussianSpeech()
    render(<WordBuilderGame onExit={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Word Builder' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'mother' })).toBeTruthy()
    expect(screen.getByText('Sounds like: mama')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Add м' })).toHaveLength(2)

    placeWord('мама')
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))

    expect(screen.getByRole('status')).toHaveTextContent('мама · mama means mother.')
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus()
    for (const tile of screen.getAllByRole('button', { name: 'Add м' })) {
      expect(tile).toBeDisabled()
    }

    fireEvent.click(screen.getByRole('button', { name: 'Play correct Russian word' }))
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0][0]).toMatchObject({ text: 'мама', lang: 'ru-RU' })
  }, 10_000)

  it('shows complete corrective feedback and immediately persists in its separate document', async () => {
    render(<WordBuilderGame onExit={vi.fn()} />)

    placeWord('маам')
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Your answer: маам')
    expect(status).toHaveTextContent('The correct answer is мама · mama, meaning mother.')
    expect(status).toHaveTextContent('This word will return soon.')

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(WORD_BUILDER_STORAGE_KEY) ?? '{}')
      expect(stored.version).toBe(1)
      expect(stored.items.mama).toMatchObject({ attempts: 1, lapses: 1, nextDueAt: stored.updatedAt })
    })
    expect(window.localStorage.getItem('bystro-bukvy-vocabulary-progress-v1')).toBeNull()
  })

  it('supports keyboard Undo, Check, Continue, and Escape without trapping tile buttons', async () => {
    const user = userEvent.setup()
    const onExit = vi.fn()
    render(<WordBuilderGame onExit={onExit} />)

    placeWord('мама')
    await user.keyboard('{Backspace}')
    expect(screen.getAllByRole('button', { name: /Remove . from position/ })).toHaveLength(3)
    const finalA = screen.getAllByRole('button', { name: 'Add а' }).find((button) => !button.hasAttribute('disabled'))!
    fireEvent.click(finalA)
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('мама · mama means mother.')

    screen.getByRole('status').focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: 'father' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Cyrillic letter tiles' }).querySelector('button')).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('completes a scheduled round and starts practice with the weakest item', () => {
    const now = Date.now()
    const progress = createWordBuilderProgress(VOCABULARY, now)
    for (const item of Object.values(progress.items)) {
      Object.assign(item, {
        level: 2,
        attempts: 2,
        correctAttempts: 2,
        lastReviewedAt: now,
        nextDueAt: now + 60_000,
        lastResult: 'correct',
      })
    }
    Object.assign(progress.items.papa, {
      level: 1,
      attempts: 3,
      correctAttempts: 1,
      lapses: 2,
      nextDueAt: now + 60_000,
    })
    window.localStorage.setItem(WORD_BUILDER_STORAGE_KEY, JSON.stringify(progress))

    render(<WordBuilderGame onExit={vi.fn()} />)
    const status = screen.getByRole('status')
    expect(within(status).getByRole('heading', { name: 'Spelling round complete' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Practice weakest items' })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Practice weakest items' }))
    expect(screen.getByRole('heading', { name: 'father' })).toBeTruthy()
  })
})
