import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { ALPHABET } from './data/alphabet'
import { STORAGE_KEY } from './hooks/useStoredProgress'
import { THEME_STORAGE_KEY } from './hooks/useTheme'
import { createLearningProgress } from './learning/scheduler'

describe('Cyrillic lesson', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(THEME_STORAGE_KEY)
    delete document.documentElement.dataset.theme
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('grades a choice immediately and reveals word translations', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Cyrillic letter А' })).toHaveClass('cyrillic-letter')
    expect(screen.getByText('Like a in father.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Play the Russian name of А' })).toBeTruthy()
    expect(screen.getByLabelText('АРБУЗ')).toBeTruthy()
    expect(screen.getByLabelText('ПАРК')).toBeTruthy()
    expect(screen.getByLabelText('САХАР')).toBeTruthy()
    expect(screen.queryByText('арбуз')).toBeNull()
    expect(screen.queryByText('arbuz')).toBeNull()
    expect(screen.queryByText('watermelon')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Choose a' }))

    expect(screen.getByText('Exactly right!')).toBeTruthy()
    expect(screen.getByText('arbuz')).toBeTruthy()
    expect(screen.getByText('watermelon')).toBeTruthy()
    expect(screen.getByText('mother')).toBeTruthy()
  })

  it('plays a letter with an available Russian browser voice', async () => {
    const user = userEvent.setup()
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
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Play the Russian name of А' }))

    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0][0]).toMatchObject({ lang: 'ru-RU', text: 'а' })
  })

  it('persists the user-selected dark mode', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy()
  })

  it('opens a separate progress screen with every letter and preserves the lesson', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Choose a' }))
    await user.click(screen.getByRole('button', { name: 'View detailed progress' }))

    expect(screen.getByRole('heading', { name: 'Your Cyrillic progress' })).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(33)
    expect(
      screen.getByRole('listitem', { name: 'А: Learning, level 1 of 5' }),
    ).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Back to lesson' }))
    expect(screen.getByRole('heading', { name: 'Cyrillic letter А' })).toBeTruthy()
    expect(screen.getByText('Exactly right!')).toBeTruthy()
  })

  it('selects multiple-choice answers with the A–D keyboard shortcuts', async () => {
    const user = userEvent.setup()
    render(<App />)

    const correctChoice = screen.getByRole('button', { name: 'Choose a' })
    const shortcut = correctChoice.getAttribute('aria-keyshortcuts')
    expect(shortcut).toMatch(/^[A-D]$/)

    await user.keyboard(shortcut!.toLowerCase())

    expect(screen.getByText('Exactly right!')).toBeTruthy()
  })

  it('reveals the expected transliteration after a mistake', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Choose o' }))

    expect(screen.getByText('Not quite yet')).toBeTruthy()
    expect(screen.getByRole('status')).toHaveTextContent('А is a')
  })

  it('moves to another letter only after Continue', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Choose a' }))
    expect(screen.getByRole('heading', { name: 'Cyrillic letter А' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Cyrillic letter Б' })).toBeTruthy()
  })

  it('keeps the answered choices visible when a letter graduates', async () => {
    const user = userEvent.setup()
    const stored = createLearningProgress(ALPHABET)
    stored.letters.a = {
      ...stored.letters.a,
      level: 2,
      choiceCorrectCount: 2,
      attempts: 2,
      correctAttempts: 2,
      nextDueAt: 0,
      lastResult: 'correct',
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Choose a' }))

    expect(screen.getByRole('button', { name: 'Choose a' })).toBeTruthy()
    expect(screen.queryByLabelText('Type the Latin equivalent')).toBeNull()
  })

  it('autofocuses confirmed typed recall, including the next typed question', async () => {
    const user = userEvent.setup()
    const stored = createLearningProgress(ALPHABET)
    stored.letters.a = {
      ...stored.letters.a,
      level: 3,
      choiceCorrectCount: 3,
      typingUnlocked: true,
      attempts: 3,
      correctAttempts: 3,
      nextDueAt: 0,
      lastResult: 'incorrect',
    }
    stored.letters.be = {
      ...stored.letters.be,
      level: 3,
      choiceCorrectCount: 3,
      typingUnlocked: true,
      attempts: 3,
      correctAttempts: 3,
      nextDueAt: 0,
      lastResult: 'correct',
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    render(<App />)

    const input = screen.getByLabelText('Type the Latin equivalent')
    expect(input).toHaveFocus()
    await user.type(input, 'a')
    expect(screen.queryByText('Exactly right!')).toBeNull()

    await user.click(screen.getByRole('button', { name: /Confirm/ }))
    expect(screen.getByText('Exactly right!')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    const nextInput = screen.getByLabelText('Type the Latin equivalent')
    expect(nextInput).toHaveFocus()
    expect(nextInput).toHaveValue('')
  })
})
