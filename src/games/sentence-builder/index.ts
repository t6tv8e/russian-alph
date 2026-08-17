export { SentenceBuilderGame } from './SentenceBuilderGame'
export type { SentenceBuilderGameProps } from './SentenceBuilderGame'

export const SENTENCE_BUILDER_INFO = {
  id: 'sentence-builder',
  title: 'Sentence Builder',
  kicker: 'Sentences · Word order',
  description: 'Arrange Russian words into complete beginner sentences.',
  icon: 'Я →',
  strategyLabels: ['Sentence production', 'Syntax retrieval'],
  storageKey: 'bystro-bukvy-sentence-builder-progress-v1',
} as const
