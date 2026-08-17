export { WordBuilderGame } from './WordBuilderGame'
export type { WordBuilderGameProps } from './WordBuilderGame'

export const WORD_BUILDER_INFO = {
  id: 'word-builder',
  title: 'Word Builder',
  kicker: 'Words · Spelling',
  description: 'Build useful Russian words from Cyrillic letter tiles.',
  icon: 'дом',
  strategyLabels: ['Active production', 'Scaffold fading'],
  storageKey: 'bystro-bukvy-word-builder-progress-v1',
} as const
