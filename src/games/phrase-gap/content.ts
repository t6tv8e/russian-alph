export interface PhraseGapItem {
  id: string
  before: string
  after: string
  answer: string
  latinAnswer: string
  completedRussian: string
  english: string
  distractors: readonly [string, string, string]
}

export const PHRASE_GAPS: readonly PhraseGapItem[] = [
  { id: 'pg-01', before: 'Это ', after: '.', answer: 'дом', latinAnswer: 'dom', completedRussian: 'Это дом.', english: 'This is a house.', distractors: ['книга', 'школа', 'город'] },
  { id: 'pg-02', before: 'Это моя ', after: '.', answer: 'мама', latinAnswer: 'mama', completedRussian: 'Это моя мама.', english: 'This is my mother.', distractors: ['папа', 'бабушка', 'собака'] },
  { id: 'pg-03', before: 'Это мой ', after: '.', answer: 'папа', latinAnswer: 'papa', completedRussian: 'Это мой папа.', english: 'This is my father.', distractors: ['мама', 'друг', 'врач'] },
  { id: 'pg-04', before: 'Моя бабушка пьёт ', after: '.', answer: 'чай', latinAnswer: 'chay', completedRussian: 'Моя бабушка пьёт чай.', english: 'My grandmother drinks tea.', distractors: ['воду', 'хлеб', 'книгу'] },
  { id: 'pg-05', before: 'Мой друг читает ', after: '.', answer: 'книгу', latinAnswer: 'knigu', completedRussian: 'Мой друг читает книгу.', english: 'My friend reads a book.', distractors: ['билет', 'воду', 'улицу'] },
  { id: 'pg-06', before: '', after: ' работает в городе.', answer: 'Врач', latinAnswer: 'vrach', completedRussian: 'Врач работает в городе.', english: 'The doctor works in the city.', distractors: ['Друг', 'Папа', 'Кот'] },
  { id: 'pg-07', before: 'Это новая ', after: '.', answer: 'школа', latinAnswer: 'shkola', completedRussian: 'Это новая школа.', english: 'This is a new school.', distractors: ['машина', 'улица', 'книга'] },
  { id: 'pg-08', before: 'Я читаю ', after: '.', answer: 'книгу', latinAnswer: 'knigu', completedRussian: 'Я читаю книгу.', english: 'I am reading a book.', distractors: ['билет', 'хлеб', 'воду'] },
  { id: 'pg-09', before: 'Вот мой ', after: '.', answer: 'билет', latinAnswer: 'bilet', completedRussian: 'Вот мой билет.', english: 'Here is my ticket.', distractors: ['поезд', 'стол', 'город'] },
  { id: 'pg-10', before: 'Это моя ', after: '.', answer: 'работа', latinAnswer: 'rabota', completedRussian: 'Это моя работа.', english: 'This is my job.', distractors: ['школа', 'машина', 'улица'] },
  { id: 'pg-11', before: 'Москва — большой ', after: '.', answer: 'город', latinAnswer: 'gorod', completedRussian: 'Москва — большой город.', english: 'Moscow is a big city.', distractors: ['дом', 'поезд', 'стол'] },
  { id: 'pg-12', before: 'Это тихая ', after: '.', answer: 'улица', latinAnswer: 'ulitsa', completedRussian: 'Это тихая улица.', english: 'This is a quiet street.', distractors: ['школа', 'машина', 'работа'] },
  { id: 'pg-13', before: 'Вот моя ', after: '.', answer: 'машина', latinAnswer: 'mashina', completedRussian: 'Вот моя машина.', english: 'Here is my car.', distractors: ['улица', 'школа', 'книга'] },
  { id: 'pg-14', before: '', after: ' уже здесь.', answer: 'Поезд', latinAnswer: 'poyezd', completedRussian: 'Поезд уже здесь.', english: 'The train is already here.', distractors: ['Билет', 'Город', 'Врач'] },
  { id: 'pg-15', before: 'Книга лежит на ', after: '.', answer: 'столе', latinAnswer: 'stole', completedRussian: 'Книга лежит на столе.', english: 'The book is on the table.', distractors: ['окне', 'поезде', 'хлебе'] },
  { id: 'pg-16', before: 'Окно в ', after: '.', answer: 'доме', latinAnswer: 'dome', completedRussian: 'Окно в доме.', english: 'The window is in the house.', distractors: ['городе', 'школе', 'поезде'] },
  { id: 'pg-17', before: 'Я ем ', after: '.', answer: 'хлеб', latinAnswer: 'khleb', completedRussian: 'Я ем хлеб.', english: 'I eat bread.', distractors: ['чай', 'воду', 'молоко'] },
  { id: 'pg-18', before: 'Я пью ', after: '.', answer: 'молоко', latinAnswer: 'moloko', completedRussian: 'Я пью молоко.', english: 'I drink milk.', distractors: ['хлеб', 'яблоко', 'билет'] },
  { id: 'pg-19', before: 'Я пью ', after: '.', answer: 'воду', latinAnswer: 'vodu', completedRussian: 'Я пью воду.', english: 'I drink water.', distractors: ['чай', 'хлеб', 'рыбу'] },
  { id: 'pg-20', before: 'Мы пьём ', after: '.', answer: 'чай', latinAnswer: 'chay', completedRussian: 'Мы пьём чай.', english: 'We drink tea.', distractors: ['воду', 'молоко', 'хлеб'] },
  { id: 'pg-21', before: 'Я ем ', after: '.', answer: 'яблоко', latinAnswer: 'yabloko', completedRussian: 'Я ем яблоко.', english: 'I eat an apple.', distractors: ['хлеб', 'рыбу', 'книгу'] },
  { id: 'pg-22', before: 'Кот любит ', after: '.', answer: 'рыбу', latinAnswer: 'rybu', completedRussian: 'Кот любит рыбу.', english: 'The cat likes fish.', distractors: ['воду', 'книгу', 'собаку'] },
  { id: 'pg-23', before: 'У меня есть ', after: '.', answer: 'кот', latinAnswer: 'kot', completedRussian: 'У меня есть кот.', english: 'I have a cat.', distractors: ['собака', 'друг', 'врач'] },
  { id: 'pg-24', before: 'У меня есть ', after: '.', answer: 'собака', latinAnswer: 'sobaka', completedRussian: 'У меня есть собака.', english: 'I have a dog.', distractors: ['кот', 'рыба', 'машина'] },
]

export function normalizeReconstruction(value: string): string {
  return value.normalize('NFC').replace(/\s+/gu, ' ').trim()
}

export function reconstructPhrase(item: PhraseGapItem): string {
  return normalizeReconstruction(`${item.before}${item.answer}${item.after}`)
}

export function validatePhraseGaps(items: readonly PhraseGapItem[]): string[] {
  const errors: string[] = []
  const ids = new Set<string>()

  if (items.length !== 24) errors.push('Phrase Gap requires exactly 24 items.')

  for (const item of items) {
    if (ids.has(item.id)) errors.push(`${item.id}: duplicate id.`)
    ids.add(item.id)
    if (!item.id || !item.answer || !item.latinAnswer || !item.completedRussian || !item.english) {
      errors.push(`${item.id || '(missing id)'}: required fields must be nonempty.`)
    }
    if (reconstructPhrase(item) !== item.completedRussian) {
      errors.push(`${item.id}: before/answer/after does not reconstruct completedRussian.`)
    }
    if (item.distractors.length !== 3 || new Set(item.distractors).size !== 3) {
      errors.push(`${item.id}: requires exactly three unique distractors.`)
    }
    if (item.distractors.includes(item.answer)) {
      errors.push(`${item.id}: answer cannot be a distractor.`)
    }
  }
  return errors
}

const authoredContentErrors = validatePhraseGaps(PHRASE_GAPS)
if (authoredContentErrors.length > 0) {
  throw new Error(authoredContentErrors.join('\n'))
}
