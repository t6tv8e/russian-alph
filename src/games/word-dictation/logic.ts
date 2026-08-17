import { VOCABULARY } from '../../data/vocabulary'
import type { VocabularyWord } from '../../learning/vocabularyTypes'
import type {
  LetterTile,
  WordDictationItemProgress,
  WordDictationProgress,
  WordDictationSession,
} from './types'

export const WORD_DICTATION_STORAGE_KEY = 'bystro-bukvy-word-dictation-progress-v1'
export const WORD_DICTATION_MAX_LEVEL = 5
export const WORD_DICTATION_INTERVALS = [
  0,
  0,
  10 * 60 * 1000,
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  10 * 24 * 60 * 60 * 1000,
] as const

const FALLBACK_CHARACTERS = Array.from('абвгдежзийклмнопрстуфхцчшщыэюя')

export function validateWordDictationContent(words: VocabularyWord[]): string[] {
  const issues: string[] = []
  const ids = new Set<string>()

  if (words.length !== 24) {
    issues.push('Word Dictation requires all 24 vocabulary records.')
  }

  for (const word of words) {
    if (!word.id || !word.russian || !word.latin || !word.english) {
      issues.push(`Vocabulary record ${word.id || '(missing id)'} has an empty required field.`)
    }
    if (ids.has(word.id)) {
      issues.push(`Duplicate vocabulary id: ${word.id}.`)
    }
    ids.add(word.id)
    if (word.russian !== word.russian.toLocaleLowerCase('ru')) {
      issues.push(`Vocabulary word ${word.id} must use lowercase Russian.`)
    }
    if (word.distractorIds.length !== 3) {
      issues.push(`Vocabulary word ${word.id} must have three distractor ids.`)
    }
  }

  for (const word of words) {
    for (const distractorId of word.distractorIds) {
      if (!ids.has(distractorId)) {
        issues.push(`Vocabulary word ${word.id} has unknown distractor ${distractorId}.`)
      }
    }
  }

  return issues
}

function freshItem(now: number): WordDictationItemProgress {
  return {
    level: 0,
    attempts: 0,
    correctAttempts: 0,
    lastReviewedAt: null,
    nextDueAt: now,
    lastResult: null,
  }
}

function freshSession(words: VocabularyWord[]): WordDictationSession {
  return {
    currentId: words[0]?.id ?? null,
    recentIds: [],
    practiceMode: false,
    questionLevel: 0,
    placedTileIds: [],
    hasPlayed: false,
    phase: 'question',
    result: null,
    learnerAnswer: '',
  }
}

export function createWordDictationProgress(
  words: VocabularyWord[] = VOCABULARY,
  now: number = Date.now(),
): WordDictationProgress {
  return {
    version: 1,
    items: Object.fromEntries(words.map((word) => [word.id, freshItem(now)])),
    updatedAt: now,
    session: freshSession(words),
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidItem(value: unknown): value is WordDictationItemProgress {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<WordDictationItemProgress>
  return (
    Number.isInteger(item.level) &&
    (item.level ?? -1) >= 0 &&
    (item.level ?? 6) <= WORD_DICTATION_MAX_LEVEL &&
    Number.isInteger(item.attempts) &&
    (item.attempts ?? -1) >= 0 &&
    Number.isInteger(item.correctAttempts) &&
    (item.correctAttempts ?? -1) >= 0 &&
    (item.correctAttempts ?? 1) <= (item.attempts ?? 0) &&
    (item.lastReviewedAt === null || isFiniteNumber(item.lastReviewedAt)) &&
    isFiniteNumber(item.nextDueAt) &&
    (item.lastResult === null || item.lastResult === 'correct' || item.lastResult === 'incorrect')
  )
}

function hydrateSession(
  value: unknown,
  words: VocabularyWord[],
  items: Record<string, WordDictationItemProgress>,
): WordDictationSession {
  const fallback = freshSession(words)
  if (!value || typeof value !== 'object') return fallback
  const session = value as Partial<WordDictationSession>
  const knownIds = new Set(words.map((word) => word.id))
  const currentId = session.currentId === null ||
    (typeof session.currentId === 'string' && knownIds.has(session.currentId))
    ? session.currentId
    : fallback.currentId
  const result = session.result === 'correct' || session.result === 'incorrect'
    ? session.result
    : null
  const phase = session.phase === 'feedback' && result ? 'feedback' : 'question'

  return {
    currentId,
    recentIds: Array.isArray(session.recentIds)
      ? session.recentIds.filter((id): id is string => typeof id === 'string' && knownIds.has(id)).slice(-2)
      : [],
    practiceMode: session.practiceMode === true,
    questionLevel: Number.isInteger(session.questionLevel) &&
      (session.questionLevel ?? -1) >= 0 &&
      (session.questionLevel ?? 6) <= WORD_DICTATION_MAX_LEVEL
      ? session.questionLevel as number
      : currentId ? items[currentId]?.level ?? 0 : 0,
    placedTileIds: Array.isArray(session.placedTileIds)
      ? session.placedTileIds.filter((id): id is string => typeof id === 'string')
      : [],
    hasPlayed: session.hasPlayed === true,
    phase,
    result: phase === 'feedback' ? result : null,
    learnerAnswer: typeof session.learnerAnswer === 'string' ? session.learnerAnswer : '',
  }
}

export function hydrateWordDictationProgress(
  value: unknown,
  words: VocabularyWord[] = VOCABULARY,
  now: number = Date.now(),
): WordDictationProgress {
  const fresh = createWordDictationProgress(words, now)
  if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 1) {
    return fresh
  }

  const candidate = value as Partial<WordDictationProgress>
  const storedItems = candidate.items && typeof candidate.items === 'object' ? candidate.items : {}
  const items = Object.fromEntries(words.map((word) => {
    const stored = (storedItems as Record<string, unknown>)[word.id]
    return [word.id, isValidItem(stored) ? stored : freshItem(now)]
  }))

  return {
    version: 1,
    items,
    updatedAt: isFiniteNumber(candidate.updatedAt) ? candidate.updatedAt : now,
    session: hydrateSession(candidate.session, words, items),
  }
}

export function getDistractorCount(level: number): number {
  if (level <= 1) return 1
  if (level <= 3) return 2
  return 3
}

export function showsTransliteration(level: number): boolean {
  return level <= 1
}

function shuffled<T>(values: T[], random: () => number): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function buildWordDictationTiles(
  target: VocabularyWord,
  words: VocabularyWord[] = VOCABULARY,
  level: number,
  random: () => number = Math.random,
): LetterTile[] {
  const occurrenceCounts = new Map<string, number>()
  const answerTiles = Array.from(target.russian.toLocaleLowerCase('ru')).map((value) => {
    const occurrence = occurrenceCounts.get(value) ?? 0
    occurrenceCounts.set(value, occurrence + 1)
    return { id: `${target.id}-${value}-${occurrence}`, value, distractor: false }
  })
  const targetCharacters = new Set(answerTiles.map((tile) => tile.value))
  const byId = new Map(words.map((word) => [word.id, word]))
  const candidates: string[] = []

  for (const distractorId of target.distractorIds) {
    const distractorWord = byId.get(distractorId)
    if (!distractorWord) continue
    for (const character of Array.from(distractorWord.russian.toLocaleLowerCase('ru'))) {
      if (!targetCharacters.has(character) && !candidates.includes(character)) {
        candidates.push(character)
      }
    }
  }
  for (const character of FALLBACK_CHARACTERS) {
    if (!targetCharacters.has(character) && !candidates.includes(character)) {
      candidates.push(character)
    }
  }

  const distractorTiles = candidates.slice(0, getDistractorCount(level)).map((value, index) => ({
    id: `${target.id}-d-${value}-${index}`,
    value,
    distractor: true,
  }))
  const bank = shuffled([...answerTiles, ...distractorTiles], random)
  const visiblePrefix = bank.slice(0, answerTiles.length).map((tile) => tile.value).join('')
  if (bank.length > 1 && visiblePrefix === target.russian.toLocaleLowerCase('ru')) {
    bank.push(bank.shift()!)
  }
  return bank
}

export function gradeWordDictation(tiles: LetterTile[], placedTileIds: string[], answer: string): boolean {
  const byId = new Map(tiles.map((tile) => [tile.id, tile]))
  return placedTileIds.map((id) => byId.get(id)?.value ?? '').join('') === answer.toLocaleLowerCase('ru')
}

export function recordWordDictationAnswer(
  progress: WordDictationProgress,
  wordId: string,
  correct: boolean,
  now: number = Date.now(),
): WordDictationProgress {
  const previous = progress.items[wordId]
  if (!previous) return progress
  const level = correct
    ? Math.min(WORD_DICTATION_MAX_LEVEL, previous.level + 1)
    : Math.max(0, previous.level - 1)
  return {
    ...progress,
    updatedAt: now,
    items: {
      ...progress.items,
      [wordId]: {
        level,
        attempts: previous.attempts + 1,
        correctAttempts: previous.correctAttempts + (correct ? 1 : 0),
        lastReviewedAt: now,
        nextDueAt: correct ? now + WORD_DICTATION_INTERVALS[level] : now,
        lastResult: correct ? 'correct' : 'incorrect',
      },
    },
  }
}

function accuracy(item: WordDictationItemProgress): number {
  return item.attempts === 0 ? 1 : item.correctAttempts / item.attempts
}

function availableWithGap(ids: string[], recentIds: string[]): string[] {
  const outsideGap = ids.filter((id) => !recentIds.slice(-2).includes(id))
  return outsideGap.length > 0 ? outsideGap : ids
}

export function selectNextWordDictationId(
  words: VocabularyWord[],
  progress: WordDictationProgress,
  now: number = Date.now(),
  recentIds: string[] = [],
): string | null {
  const seenDue = words.filter((word) => {
    const item = progress.items[word.id]
    return item && item.attempts > 0 && item.nextDueAt <= now
  })
  const missed = seenDue.filter((word) => progress.items[word.id].lastResult === 'incorrect')
  const otherDue = seenDue.filter((word) => progress.items[word.id].lastResult !== 'incorrect')
  const unseen = words.filter((word) => progress.items[word.id]?.attempts === 0)
  const sortDue = (items: VocabularyWord[]) => items.sort((left, right) => {
    const a = progress.items[left.id]
    const b = progress.items[right.id]
    return a.level - b.level || a.nextDueAt - b.nextDueAt ||
      words.indexOf(left) - words.indexOf(right)
  })
  const ordered = [...sortDue(missed), ...sortDue(otherDue), ...unseen]
  if (ordered.length === 0) return null
  const allowedIds = new Set(availableWithGap(ordered.map((word) => word.id), recentIds))
  return ordered.find((word) => allowedIds.has(word.id))?.id ?? null
}

export function selectWeakestWordDictationId(
  words: VocabularyWord[],
  progress: WordDictationProgress,
  recentIds: string[] = [],
): string | null {
  const ids = availableWithGap(words.map((word) => word.id), recentIds)
  const allowed = new Set(ids)
  return [...words].filter((word) => allowed.has(word.id)).sort((left, right) => {
    const a = progress.items[left.id]
    const b = progress.items[right.id]
    const aLapses = a.attempts - a.correctAttempts
    const bLapses = b.attempts - b.correctAttempts
    return a.level - b.level || accuracy(a) - accuracy(b) || bLapses - aLapses ||
      (a.lastReviewedAt ?? -Infinity) - (b.lastReviewedAt ?? -Infinity) ||
      words.indexOf(left) - words.indexOf(right)
  })[0]?.id ?? null
}

export function getWordDictationStats(progress: WordDictationProgress) {
  const items = Object.values(progress.items)
  return {
    mastered: items.filter((item) => item.level === WORD_DICTATION_MAX_LEVEL).length,
    overall: items.length === 0
      ? 0
      : Math.round(items.reduce((sum, item) => sum + item.level, 0) /
        (items.length * WORD_DICTATION_MAX_LEVEL) * 100),
  }
}
