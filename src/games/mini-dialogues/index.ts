export { MiniDialoguesGame } from './MiniDialoguesGame'
export type { MiniDialoguesGameProps } from './MiniDialoguesGame'

export const MINI_DIALOGUES_INFO = {
  id: 'mini-dialogues',
  title: 'Mini Dialogues',
  kicker: 'Conversations · Responses',
  description: 'Choose natural replies in short everyday Russian dialogues.',
  icon: 'А—Б',
  strategyLabels: ['Pragmatic context', 'Interleaved retrieval'],
  storageKey: 'bystro-bukvy-mini-dialogues-progress-v1',
} as const
