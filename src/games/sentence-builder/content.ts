export interface SentenceBuilderSentence {
  id: string
  tokens: readonly string[]
  russian: string
  latin: string
  english: string
  distractor: string
}

export const SENTENCE_BUILDER_SENTENCES: readonly SentenceBuilderSentence[] = [
  { id: 'sb-01', tokens: ['Это', 'дом'], russian: 'Это дом.', latin: 'Eto dom.', english: 'This is a house.', distractor: 'книга' },
  { id: 'sb-02', tokens: ['Это', 'моя', 'мама'], russian: 'Это моя мама.', latin: 'Eto moya mama.', english: 'This is my mother.', distractor: 'папа' },
  { id: 'sb-03', tokens: ['Это', 'мой', 'папа'], russian: 'Это мой папа.', latin: 'Eto moy papa.', english: 'This is my father.', distractor: 'мама' },
  { id: 'sb-04', tokens: ['Это', 'моя', 'бабушка'], russian: 'Это моя бабушка.', latin: 'Eto moya babushka.', english: 'This is my grandmother.', distractor: 'друг' },
  { id: 'sb-05', tokens: ['Это', 'мой', 'друг'], russian: 'Это мой друг.', latin: 'Eto moy drug.', english: 'This is my friend.', distractor: 'врач' },
  { id: 'sb-06', tokens: ['Это', 'врач'], russian: 'Это врач.', latin: 'Eto vrach.', english: 'This is a doctor.', distractor: 'друг' },
  { id: 'sb-07', tokens: ['Это', 'школа'], russian: 'Это школа.', latin: 'Eto shkola.', english: 'This is a school.', distractor: 'работа' },
  { id: 'sb-08', tokens: ['Это', 'книга'], russian: 'Это книга.', latin: 'Eto kniga.', english: 'This is a book.', distractor: 'билет' },
  { id: 'sb-09', tokens: ['Это', 'билет'], russian: 'Это билет.', latin: 'Eto bilet.', english: 'This is a ticket.', distractor: 'поезд' },
  { id: 'sb-10', tokens: ['Это', 'моя', 'работа'], russian: 'Это моя работа.', latin: 'Eto moya rabota.', english: 'This is my job.', distractor: 'школа' },
  { id: 'sb-11', tokens: ['Это', 'большой', 'город'], russian: 'Это большой город.', latin: 'Eto bolshoy gorod.', english: 'This is a big city.', distractor: 'дом' },
  { id: 'sb-12', tokens: ['Это', 'тихая', 'улица'], russian: 'Это тихая улица.', latin: 'Eto tikhaya ulitsa.', english: 'This is a quiet street.', distractor: 'город' },
  { id: 'sb-13', tokens: ['Это', 'новая', 'машина'], russian: 'Это новая машина.', latin: 'Eto novaya mashina.', english: 'This is a new car.', distractor: 'поезд' },
  { id: 'sb-14', tokens: ['Это', 'мой', 'поезд'], russian: 'Это мой поезд.', latin: 'Eto moy poyezd.', english: 'This is my train.', distractor: 'машина' },
  { id: 'sb-15', tokens: ['Вот', 'стол'], russian: 'Вот стол.', latin: 'Vot stol.', english: 'Here is a table.', distractor: 'окно' },
  { id: 'sb-16', tokens: ['Вот', 'окно'], russian: 'Вот окно.', latin: 'Vot okno.', english: 'Here is a window.', distractor: 'стол' },
  { id: 'sb-17', tokens: ['Я', 'ем', 'хлеб'], russian: 'Я ем хлеб.', latin: 'Ya yem khleb.', english: 'I eat bread.', distractor: 'яблоко' },
  { id: 'sb-18', tokens: ['Я', 'пью', 'молоко'], russian: 'Я пью молоко.', latin: 'Ya pyu moloko.', english: 'I drink milk.', distractor: 'воду' },
  { id: 'sb-19', tokens: ['Я', 'пью', 'воду'], russian: 'Я пью воду.', latin: 'Ya pyu vodu.', english: 'I drink water.', distractor: 'чай' },
  { id: 'sb-20', tokens: ['Я', 'пью', 'чай'], russian: 'Я пью чай.', latin: 'Ya pyu chay.', english: 'I drink tea.', distractor: 'молоко' },
  { id: 'sb-21', tokens: ['Я', 'ем', 'яблоко'], russian: 'Я ем яблоко.', latin: 'Ya yem yabloko.', english: 'I eat an apple.', distractor: 'хлеб' },
  { id: 'sb-22', tokens: ['Я', 'вижу', 'рыбу'], russian: 'Я вижу рыбу.', latin: 'Ya vizhu rybu.', english: 'I see a fish.', distractor: 'кошку' },
  { id: 'sb-23', tokens: ['У', 'меня', 'есть', 'кот'], russian: 'У меня есть кот.', latin: 'U menya yest kot.', english: 'I have a cat.', distractor: 'собака' },
  { id: 'sb-24', tokens: ['У', 'меня', 'есть', 'собака'], russian: 'У меня есть собака.', latin: 'U menya yest sobaka.', english: 'I have a dog.', distractor: 'кот' },
]

export function validateSentenceBuilderContent(
  sentences: readonly SentenceBuilderSentence[] = SENTENCE_BUILDER_SENTENCES,
): string[] {
  const errors: string[] = []
  const ids = new Set<string>()

  for (const sentence of sentences) {
    if (
      !sentence.id.trim() || !sentence.russian.trim() || !sentence.latin.trim() ||
      !sentence.english.trim() || !sentence.distractor.trim() ||
      sentence.tokens.length === 0 || sentence.tokens.some((token) => !token.trim())
    ) {
      errors.push(`${sentence.id || 'unknown'} has an empty required field`)
    }
    if (ids.has(sentence.id)) errors.push(`${sentence.id} is duplicated`)
    ids.add(sentence.id)
    if (sentence.russian !== `${sentence.tokens.join(' ')}.`) errors.push(`${sentence.id} does not reconstruct its Russian sentence`)
    if (sentence.tokens.includes(sentence.distractor)) errors.push(`${sentence.id} uses a target token as its distractor`)
  }

  return errors
}
