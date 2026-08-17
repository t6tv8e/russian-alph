export { PhraseGapGame } from './PhraseGapGame'
export type { PhraseGapGameProps } from './PhraseGapGame'
export { PHRASE_GAP_STORAGE_KEY } from './storage'

export const PHRASE_GAP_INFO = {
  id: 'phrase-gap',
  title: 'Phrase Gap',
  kicker: 'Phrases · Context',
  description: 'Complete Russian phrases by retrieving the missing word.',
  icon: '…',
  strategyLabels: ['Contextual retrieval', 'Typed recall'],
  storageKey: 'bystro-bukvy-phrase-gap-progress-v1',
} as const
