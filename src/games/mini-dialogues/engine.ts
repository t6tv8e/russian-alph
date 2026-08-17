import type { MiniDialogue } from './content'

export const MINI_DIALOGUES_STORAGE_KEY = 'bystro-bukvy-mini-dialogues-progress-v1'
export const MINI_DIALOGUES_PROGRESS_VERSION = 1 as const
export const MINI_DIALOGUES_INTERVALS = [0, 0, 10 * 60 * 1000, 24 * 60 * 60 * 1000, 3 * 24 * 60 * 60 * 1000, 10 * 24 * 60 * 60 * 1000] as const
export const MINI_DIALOGUES_RECENT_GAP = 2

export interface DialogueItemProgress {
  level: number
  attempts: number
  correctAttempts: number
  lastReviewedAt: number | null
  nextDueAt: number
  lastResult: 'correct' | 'incorrect' | null
  lapses: number
}

export interface DialogueSessionState {
  currentItemId: string | null
  recentIds: string[]
  practiceMode: boolean
  phase: 'question' | 'feedback' | 'complete'
  selectedChoice: string | null
  preAnswerLevel: number | null
}

export interface MiniDialoguesProgress {
  version: 1
  items: Record<string, DialogueItemProgress>
  updatedAt: number
  session: DialogueSessionState
}

export interface DialogueChoice {
  id: string
  text: string
}

export interface DialogueScaffolds {
  showPromptLatin: boolean
  showPromptEnglish: boolean
}

function freshItem(now: number): DialogueItemProgress {
  return { level: 0, attempts: 0, correctAttempts: 0, lastReviewedAt: null, nextDueAt: now, lastResult: null, lapses: 0 }
}

export function createMiniDialoguesProgress(dialogues: readonly MiniDialogue[], now: number = Date.now()): MiniDialoguesProgress {
  return {
    version: MINI_DIALOGUES_PROGRESS_VERSION,
    items: Object.fromEntries(dialogues.map((dialogue) => [dialogue.id, freshItem(now)])),
    updatedAt: now,
    session: {
      currentItemId: dialogues[0]?.id ?? null,
      recentIds: [],
      practiceMode: false,
      phase: dialogues.length > 0 ? 'question' : 'complete',
      selectedChoice: null,
      preAnswerLevel: null,
    },
  }
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function validItem(value: unknown): value is DialogueItemProgress {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<DialogueItemProgress>
  return Number.isInteger(item.level) && finiteNonNegative(item.level) && item.level <= 5 &&
    Number.isInteger(item.attempts) && finiteNonNegative(item.attempts) &&
    Number.isInteger(item.correctAttempts) && finiteNonNegative(item.correctAttempts) &&
    item.correctAttempts <= item.attempts &&
    (item.lastReviewedAt === null || finiteNonNegative(item.lastReviewedAt)) &&
    finiteNonNegative(item.nextDueAt) &&
    (item.lastResult === null || item.lastResult === 'correct' || item.lastResult === 'incorrect') &&
    Number.isInteger(item.lapses) && finiteNonNegative(item.lapses)
}

function hydrateSession(value: unknown, knownIds: Set<string>, fallback: DialogueSessionState): DialogueSessionState {
  if (!value || typeof value !== 'object') return fallback
  const session = value as Partial<DialogueSessionState>
  const currentItemId = session.currentItemId === null || (typeof session.currentItemId === 'string' && knownIds.has(session.currentItemId))
    ? session.currentItemId
    : fallback.currentItemId
  const phase = session.phase === 'question' || session.phase === 'feedback' || session.phase === 'complete' ? session.phase : fallback.phase
  const selectedChoice = typeof session.selectedChoice === 'string' ? session.selectedChoice : null
  const preAnswerLevel = Number.isInteger(session.preAnswerLevel) && finiteNonNegative(session.preAnswerLevel) && session.preAnswerLevel <= 5
    ? session.preAnswerLevel
    : null
  return {
    currentItemId,
    recentIds: Array.isArray(session.recentIds)
      ? session.recentIds.filter((id): id is string => typeof id === 'string' && knownIds.has(id)).slice(-MINI_DIALOGUES_RECENT_GAP)
      : [],
    practiceMode: session.practiceMode === true,
    phase: currentItemId === null ? 'complete' : phase,
    selectedChoice: phase === 'feedback' ? selectedChoice : null,
    preAnswerLevel: phase === 'feedback' ? preAnswerLevel : null,
  }
}

export function hydrateMiniDialoguesProgress(value: unknown, dialogues: readonly MiniDialogue[], now: number = Date.now()): MiniDialoguesProgress {
  const fresh = createMiniDialoguesProgress(dialogues, now)
  if (!value || typeof value !== 'object') return fresh
  const candidate = value as Partial<MiniDialoguesProgress>
  if (candidate.version !== MINI_DIALOGUES_PROGRESS_VERSION || !candidate.items || typeof candidate.items !== 'object') return fresh

  for (const dialogue of dialogues) {
    const stored = candidate.items[dialogue.id]
    if (validItem(stored)) fresh.items[dialogue.id] = { ...stored }
  }
  if (finiteNonNegative(candidate.updatedAt)) fresh.updatedAt = candidate.updatedAt
  fresh.session = hydrateSession(candidate.session, new Set(dialogues.map(({ id }) => id)), fresh.session)
  return fresh
}

export function getDialogueScaffolds(level: number): DialogueScaffolds {
  return { showPromptLatin: level <= 1, showPromptEnglish: level <= 3 }
}

export function buildDialogueChoices(dialogue: MiniDialogue, random: () => number = Math.random): DialogueChoice[] {
  const choices = [dialogue.reply, ...dialogue.distractors].map((text, index) => ({ id: `${dialogue.id}-${index}`, text }))
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[choices[index], choices[swapIndex]] = [choices[swapIndex], choices[index]]
  }
  return choices
}

export function gradeDialogueChoice(dialogue: MiniDialogue, selected: string): boolean {
  return selected === dialogue.reply
}

export function recordDialogueAnswer(progress: MiniDialoguesProgress, itemId: string, correct: boolean, now: number = Date.now()): MiniDialoguesProgress {
  const current = progress.items[itemId]
  if (!current) return progress
  const level = Math.max(0, Math.min(5, current.level + (correct ? 1 : -1)))
  const item: DialogueItemProgress = {
    ...current,
    level,
    attempts: current.attempts + 1,
    correctAttempts: current.correctAttempts + (correct ? 1 : 0),
    lastReviewedAt: now,
    nextDueAt: correct ? now + MINI_DIALOGUES_INTERVALS[level] : now,
    lastResult: correct ? 'correct' : 'incorrect',
    lapses: current.lapses + (correct ? 0 : 1),
  }
  return { ...progress, items: { ...progress.items, [itemId]: item }, updatedAt: now }
}

function dueComparator(first: MiniDialogue, second: MiniDialogue, progress: MiniDialoguesProgress): number {
  const firstItem = progress.items[first.id]
  const secondItem = progress.items[second.id]
  const firstMiss = firstItem.lastResult === 'incorrect' ? 0 : 1
  const secondMiss = secondItem.lastResult === 'incorrect' ? 0 : 1
  return firstMiss - secondMiss || firstItem.level - secondItem.level || firstItem.nextDueAt - secondItem.nextDueAt
}

export function selectNextDialogueId(
  dialogues: readonly MiniDialogue[],
  progress: MiniDialoguesProgress,
  now: number = Date.now(),
  recentIds: readonly string[] = progress.session.recentIds,
): string | null {
  const recent = new Set(recentIds.slice(-MINI_DIALOGUES_RECENT_GAP))
  const previous = dialogues.find(({ id }) => id === recentIds.at(-1))
  const due = dialogues.filter(({ id }) => {
    const item = progress.items[id]
    return item.attempts > 0 && item.nextDueAt <= now
  }).sort((a, b) => dueComparator(a, b, progress))
  const unseen = dialogues.filter(({ id }) => progress.items[id].attempts === 0)
  const candidates = [...due, ...unseen]
  const outsideGapAndSetting = candidates.find(({ id, setting }) => !recent.has(id) && setting !== previous?.setting)
  return outsideGapAndSetting?.id ?? candidates.find(({ id }) => !recent.has(id))?.id ?? candidates[0]?.id ?? null
}

function accuracy(item: DialogueItemProgress): number {
  return item.attempts === 0 ? 0 : item.correctAttempts / item.attempts
}

export function selectWeakestDialogueId(
  dialogues: readonly MiniDialogue[],
  progress: MiniDialoguesProgress,
  recentIds: readonly string[] = progress.session.recentIds,
): string | null {
  const recent = new Set(recentIds.slice(-MINI_DIALOGUES_RECENT_GAP))
  const sorted = [...dialogues].sort((first, second) => {
    const a = progress.items[first.id]
    const b = progress.items[second.id]
    return a.level - b.level || accuracy(a) - accuracy(b) || b.lapses - a.lapses ||
      (a.lastReviewedAt ?? 0) - (b.lastReviewedAt ?? 0)
  })
  return sorted.find(({ id }) => !recent.has(id))?.id ?? sorted[0]?.id ?? null
}

export function getMiniDialogueStats(progress: MiniDialoguesProgress): { mastered: number; levelPercent: number; attempts: number; accuracy: number } {
  const items = Object.values(progress.items)
  const attempts = items.reduce((sum, item) => sum + item.attempts, 0)
  const correct = items.reduce((sum, item) => sum + item.correctAttempts, 0)
  return {
    mastered: items.filter(({ level }) => level === 5).length,
    levelPercent: items.length === 0 ? 0 : Math.round(items.reduce((sum, item) => sum + item.level, 0) / (items.length * 5) * 100),
    attempts,
    accuracy: attempts === 0 ? 0 : Math.round(correct / attempts * 100),
  }
}
