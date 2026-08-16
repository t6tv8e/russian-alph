import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ALPHABET } from '../../data/alphabet'
import { LISTENING_STORAGE_KEY } from '../../hooks/useListeningSession'
import { createListeningProgress } from '../../learning/listeningScheduler'
import { ListenPickGame } from './ListenPickGame'

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
  return { speak }
}

describe('ListenPickGame', () => {
  beforeEach(() => {
    window.localStorage.removeItem(LISTENING_STORAGE_KEY)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requires explicit playback, grades immediately, and persists separate progress', async () => {
    const user = userEvent.setup()
    const { speak } = installRussianSpeech()
    render(<ListenPickGame onExit={vi.fn()} />)

    const correctChoice = screen.getByRole('button', { name: 'Choose Cyrillic letter А' })
    expect(speak).not.toHaveBeenCalled()
    expect(correctChoice).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Play Russian letter name' }))

    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0][0]).toMatchObject({ lang: 'ru-RU', text: 'а' })
    expect(correctChoice).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Choose Cyrillic letter О' }))

    expect(screen.getByText('Not quite — here it is')).toBeTruthy()
    expect(screen.getByRole('status')).toHaveTextContent('The answer is А а')
    expect(correctChoice).toHaveClass('listen-pick__choice--correct')

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(LISTENING_STORAGE_KEY) ?? '{}')
      expect(stored.version).toBe(1)
      expect(stored.letters.a).toMatchObject({ attempts: 1, lapses: 1 })
    })

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('button', { name: 'Choose Cyrillic letter Б' })).toBeDisabled()
  })

  it('supports listen, answer, and exit keyboard shortcuts', async () => {
    const user = userEvent.setup()
    const onExit = vi.fn()
    installRussianSpeech()
    render(<ListenPickGame onExit={onExit} />)

    await user.keyboard('l')
    const correctChoice = screen.getByRole('button', { name: 'Choose Cyrillic letter А' })
    const shortcut = correctChoice.getAttribute('aria-keyshortcuts')
    expect(shortcut).toMatch(/^[1-4]$/)

    await user.keyboard(shortcut!)
    expect(screen.getByText('That’s right!')).toBeTruthy()

    await user.keyboard('{Escape}')
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('offers accessible free practice after all 33 scheduled letters are clear', async () => {
    const user = userEvent.setup()
    const now = Date.now()
    const progress = createListeningProgress(ALPHABET, now)

    for (const letter of ALPHABET) {
      progress.letters[letter.id] = {
        ...progress.letters[letter.id],
        level: 1,
        streak: 1,
        attempts: 1,
        correctAttempts: 1,
        lastReviewedAt: now,
        nextDueAt: now + 60 * 60 * 1000,
        lastResult: 'correct',
      }
    }
    window.localStorage.setItem(LISTENING_STORAGE_KEY, JSON.stringify(progress))

    render(<ListenPickGame onExit={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Отлично!' })).toHaveFocus()
    expect(screen.getByText('33/33')).toBeTruthy()
    expect(screen.getByText('letters practised')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Practice weakest letters' }))
    expect(screen.getByRole('heading', { name: 'Listen & Pick' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Finish practice' })).toBeTruthy()
  })
})
