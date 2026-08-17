export { WordDictationGame } from './WordDictationGame'
export type { WordDictationGameProps } from './WordDictationGame'

export const WORD_DICTATION_INFO = {
  id: 'word-dictation',
  title: 'Word Dictation',
  kicker: 'Words · Listening',
  description: 'Hear a Russian word and spell it with Cyrillic tiles.',
  icon: '🔊',
  strategyLabels: ['Listening retrieval', 'Sound-to-spelling'],
  storageKey: 'bystro-bukvy-word-dictation-progress-v1',
} as const
