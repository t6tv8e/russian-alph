import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { READING_DECK } from './deck'
import { ReadingSprintGame } from './ReadingSprintGame'
import { READING_SPRINT_STORAGE_KEY } from './progress'

function startSprint() {
  render(<ReadingSprintGame onExit={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
}

function currentCard() {
  const russian = screen.getByRole('heading', { level: 2 }).textContent
  return READING_DECK.find((card) => card.russian === russian)!
}

describe('ReadingSprintGame', () => {
  let clock = 0
  let visibility = 'visible'

  beforeEach(() => {
    window.localStorage.removeItem(READING_SPRINT_STORAGE_KEY)
    vi.useFakeTimers()
    clock = 0
    visibility = 'visible'
    vi.spyOn(performance, 'now').mockImplementation(() => clock)
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('hides English, grades once, persists incorrect feedback, and locks A–D during 400ms', () => {
    startSprint()
    const card = currentCard()
    expect(card).toBe(READING_DECK[0])
    expect(screen.queryByText(card.english)).not.toBeInTheDocument()

    const buttons = screen.getAllByRole('button').filter((button) =>
      button.hasAttribute('aria-keyshortcuts'),
    )
    const wrong = buttons.find((button) => button.textContent?.includes(card.latin) === false)!
    fireEvent.click(wrong)

    expect(screen.getByRole('status')).toHaveTextContent(`${card.russian} · ${card.latin} — ${card.english}`)
    expect(screen.getByRole('status')).toHaveTextContent('This word will return soon.')
    expect(buttons.every((button) => button.hasAttribute('disabled'))).toBe(true)
    const stored = JSON.parse(window.localStorage.getItem(READING_SPRINT_STORAGE_KEY) ?? '{}')
    expect(stored.items[card.id]).toMatchObject({ attempts: 1, correctAttempts: 0, lapses: 1 })

    fireEvent.keyDown(window, { key: 'A' })
    expect(JSON.parse(window.localStorage.getItem(READING_SPRINT_STORAGE_KEY)!).items[card.id].attempts).toBe(1)

    act(() => vi.advanceTimersByTime(399))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(card.russian)
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveTextContent(card.russian)
  })

  it('uses the performance clock for exact 45-second termination without interval drift', () => {
    startSprint()
    const card = currentCard()
    fireEvent.click(screen.getByRole('button', { name: card.latin }))

    clock = 44_999
    act(() => vi.advanceTimersByTime(45_000))
    expect(screen.getByRole('timer')).toHaveTextContent('1 seconds')

    clock = 45_000
    act(() => vi.advanceTimersByTime(250))
    expect(screen.getByRole('heading', { name: 'Reading Sprint results' })).toBeInTheDocument()
    expect(screen.getByText('100', { selector: 'strong' })).toBeInTheDocument()

    const stored = JSON.parse(window.localStorage.getItem(READING_SPRINT_STORAGE_KEY) ?? '{}')
    expect(stored).toMatchObject({ bestSprintScore: 100, bestSprintAccuracy: 100 })
  })

  it('pauses the performance-clock round while the document is hidden', () => {
    startSprint()

    clock = 30_000
    visibility = 'hidden'
    fireEvent(document, new Event('visibilitychange'))

    clock = 70_000
    act(() => vi.advanceTimersByTime(45_000))
    expect(screen.getByRole('timer')).toHaveTextContent('15 seconds')

    visibility = 'visible'
    fireEvent(document, new Event('visibilitychange'))
    clock = 84_999
    act(() => vi.advanceTimersByTime(250))
    expect(screen.getByRole('timer')).toHaveTextContent('1 seconds')

    clock = 85_000
    act(() => vi.advanceTimersByTime(250))
    expect(screen.getByRole('heading', { name: 'Reading Sprint results' })).toBeInTheDocument()
  })

  it('completes exactly 20 cards in relaxed mode with learner-controlled Continue', () => {
    render(<ReadingSprintGame onExit={vi.fn()} />)
    fireEvent.click(screen.getByRole('radio', { name: /Relaxed 20-card round/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    for (let question = 1; question <= 20; question += 1) {
      const card = currentCard()
      fireEvent.click(screen.getByRole('button', { name: card.latin }))
      expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus()
      expect(screen.getByText((_, element) =>
        element?.tagName === 'SPAN' && element.textContent === `${question} of 20`,
      )).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    }

    expect(screen.getByRole('heading', { name: 'Reading Sprint results' })).toBeInTheDocument()
    expect(screen.getByText('20/20')).toBeInTheDocument()
    expect(screen.getByText('100%', { selector: 'strong' })).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(READING_SPRINT_STORAGE_KEY)!).bestRelaxedAccuracy).toBe(100)
  }, 20_000)

  it('requires inline confirmation before Escape can end an active round', () => {
    const onExit = vi.fn()
    render(<ReadingSprintGame onExit={onExit} />)
    expect(screen.getByRole('button', { name: 'Start' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onExit).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toHaveTextContent('End this round?')
    expect(screen.getByRole('button', { name: 'Keep reading' })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Keep reading' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'End round' }))
    expect(screen.getByRole('heading', { name: 'Reading Sprint results' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
