import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { ALPHABET } from './data/alphabet'
import { STORAGE_KEY } from './hooks/useStoredProgress'
import { createLearningProgress } from './learning/scheduler'

describe('Cyrillic lesson', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
  })

  it('grades a choice immediately and reveals word translations', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Cyrillic letter А' })).toHaveClass('cyrillic-letter')
    expect(screen.getByLabelText('АРБУЗ')).toBeTruthy()
    expect(screen.getByLabelText('ПАРК')).toBeTruthy()
    expect(screen.queryByText('арбуз')).toBeNull()
    expect(screen.queryByText('arbuz')).toBeNull()
    expect(screen.queryByText('watermelon')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Choose a' }))

    expect(screen.getByText('Exactly right!')).toBeTruthy()
    expect(screen.getByText('arbuz')).toBeTruthy()
    expect(screen.getByText('watermelon')).toBeTruthy()
    expect(screen.getByText('mother')).toBeTruthy()
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

  it('uses confirmed typed recall for a familiar letter', async () => {
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
      lastResult: 'correct',
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    render(<App />)

    const input = screen.getByLabelText('Type the Latin equivalent')
    await user.type(input, 'a')
    expect(screen.queryByText('Exactly right!')).toBeNull()

    await user.click(screen.getByRole('button', { name: /Confirm/ }))
    expect(screen.getByText('Exactly right!')).toBeTruthy()
  })
})
