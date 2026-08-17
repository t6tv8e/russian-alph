import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MINI_DIALOGUES } from './content'
import { createMiniDialoguesProgress, MINI_DIALOGUES_STORAGE_KEY } from './engine'
import { MiniDialoguesGame } from './MiniDialoguesGame'
import './content.cases'
import './engine.cases'

function installRussianSpeech() {
  const speak = vi.fn()
  const speechSynthesis = {
    addEventListener: vi.fn(), cancel: vi.fn(),
    getVoices: () => [{ lang: 'ru-RU', name: 'Russian' } as SpeechSynthesisVoice],
    removeEventListener: vi.fn(), speak,
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

describe('MiniDialoguesGame', () => {
  beforeEach(() => window.localStorage.removeItem(MINI_DIALOGUES_STORAGE_KEY))
  afterEach(() => vi.unstubAllGlobals())

  it('grades a natural reply once and reveals the complete supported exchange', () => {
    installRussianSpeech()
    render(<MiniDialoguesGame onExit={vi.fn()} />)

    expect(screen.getByText('Privet!')).toBeInTheDocument()
    expect(screen.getByText('Hi!')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Привет!' }))

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Привет! is the natural reply.')
    expect(status).toHaveTextContent('Returning the same friendly greeting is a natural response here.')
    expect(screen.getAllByText('Privet!')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Привет!' })).toBeDisabled()
  })

  it('marks a wrong choice and the correct choice, persists the miss, and says it returns soon', async () => {
    installRussianSpeech()
    render(<MiniDialoguesGame onExit={vi.fn()} />)
    const wrong = screen.getByRole('button', { name: 'Сто рублей.' })
    fireEvent.click(wrong)

    expect(wrong).toHaveClass('mini-dialogues__choice--incorrect')
    expect(screen.getByRole('button', { name: 'Привет!' })).toHaveClass('mini-dialogues__choice--correct')
    expect(screen.getByRole('status')).toHaveTextContent('The complete correct reply is Привет! This dialogue will return soon.')
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(MINI_DIALOGUES_STORAGE_KEY) ?? '{}')
      expect(stored.items['md-01']).toMatchObject({ attempts: 1, lastResult: 'incorrect', nextDueAt: expect.any(Number) })
      expect(stored.session.phase).toBe('feedback')
    })
  })

  it('supports A–D and Escape, shows Russian-only at level 4, and prompt audio never speaks a reply', () => {
    const onExit = vi.fn()
    const speak = installRussianSpeech()
    const progress = createMiniDialoguesProgress(MINI_DIALOGUES, 1_000)
    progress.items['md-03'] = {
      level: 4, attempts: 4, correctAttempts: 4, lastReviewedAt: 1_000,
      nextDueAt: 2_000, lastResult: 'correct', lapses: 0,
    }
    progress.session.currentItemId = 'md-03'
    window.localStorage.setItem(MINI_DIALOGUES_STORAGE_KEY, JSON.stringify(progress))
    render(<MiniDialoguesGame onExit={onExit} />)

    expect(screen.getByRole('heading', { name: 'Как дела?' })).toBeInTheDocument()
    expect(screen.queryByText('Kak dela?')).not.toBeInTheDocument()
    expect(screen.queryByText('How are things?')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Play Russian prompt' }))
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0][0]).toMatchObject({ text: 'Как дела?', lang: 'ru-RU' })
    expect(speak.mock.calls[0][0]).not.toMatchObject({ text: 'Хорошо, спасибо.' })

    const correct = screen.getByRole('button', { name: 'Хорошо, спасибо.' })
    fireEvent.keyDown(window, { key: correct.getAttribute('aria-keyshortcuts')! })
    expect(screen.getByRole('status')).toHaveTextContent('Good, thank you.')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('offers weakest-dialogue practice from accessible completion', () => {
    installRussianSpeech()
    const progress = createMiniDialoguesProgress(MINI_DIALOGUES, 1_000)
    for (const dialogue of MINI_DIALOGUES) {
      progress.items[dialogue.id] = {
        level: 2, attempts: 2, correctAttempts: 2, lastReviewedAt: 1_000,
        nextDueAt: 999_999, lastResult: 'correct', lapses: 0,
      }
    }
    progress.items['md-08'].level = 1
    progress.session.currentItemId = null
    progress.session.phase = 'complete'
    window.localStorage.setItem(MINI_DIALOGUES_STORAGE_KEY, JSON.stringify(progress))
    render(<MiniDialoguesGame onExit={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Отлично!' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Practice weakest items' }))
    expect(screen.getByText('Language ability')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finish practice' })).toBeInTheDocument()
  })
})
