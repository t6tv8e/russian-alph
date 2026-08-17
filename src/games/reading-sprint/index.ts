export { ReadingSprintGame } from './ReadingSprintGame'
export type { ReadingSprintGameProps } from './ReadingSprintGame'

export const READING_SPRINT_INFO = {
  id: 'reading-sprint',
  title: 'Reading Sprint',
  kicker: 'Reading · Fluency',
  description: 'Decode Cyrillic words quickly while protecting accuracy.',
  icon: '⚡',
  strategyLabels: ['Reading automaticity', 'Accuracy under speed'],
  storageKey: 'bystro-bukvy-reading-sprint-progress-v1',
} as const
