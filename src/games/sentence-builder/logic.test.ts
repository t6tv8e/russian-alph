import { describe, expect, it } from 'vitest'
import { SENTENCE_BUILDER_SENTENCES, validateSentenceBuilderContent } from './content'
import {
  buildSentenceTiles,
  createSentenceBuilderProgress,
  getSentenceQuestionMode,
  gradeSentenceTokens,
  hydrateSentenceBuilderProgress,
  recordSentenceAnswer,
  selectNextSentenceId,
  selectWeakestSentenceId,
  SENTENCE_BUILDER_INTERVALS,
} from './logic'

describe('sentence builder authored content', () => {
  it('contains and validates all 24 exact authored records', () => {
    expect(validateSentenceBuilderContent()).toEqual([])
    expect(SENTENCE_BUILDER_SENTENCES).toHaveLength(24)
    expect(SENTENCE_BUILDER_SENTENCES.map(({ id, russian, latin, english, distractor }) => [id, russian, latin, english, distractor])).toEqual([
      ['sb-01', 'Это дом.', 'Eto dom.', 'This is a house.', 'книга'],
      ['sb-02', 'Это моя мама.', 'Eto moya mama.', 'This is my mother.', 'папа'],
      ['sb-03', 'Это мой папа.', 'Eto moy papa.', 'This is my father.', 'мама'],
      ['sb-04', 'Это моя бабушка.', 'Eto moya babushka.', 'This is my grandmother.', 'друг'],
      ['sb-05', 'Это мой друг.', 'Eto moy drug.', 'This is my friend.', 'врач'],
      ['sb-06', 'Это врач.', 'Eto vrach.', 'This is a doctor.', 'друг'],
      ['sb-07', 'Это школа.', 'Eto shkola.', 'This is a school.', 'работа'],
      ['sb-08', 'Это книга.', 'Eto kniga.', 'This is a book.', 'билет'],
      ['sb-09', 'Это билет.', 'Eto bilet.', 'This is a ticket.', 'поезд'],
      ['sb-10', 'Это моя работа.', 'Eto moya rabota.', 'This is my job.', 'школа'],
      ['sb-11', 'Это большой город.', 'Eto bolshoy gorod.', 'This is a big city.', 'дом'],
      ['sb-12', 'Это тихая улица.', 'Eto tikhaya ulitsa.', 'This is a quiet street.', 'город'],
      ['sb-13', 'Это новая машина.', 'Eto novaya mashina.', 'This is a new car.', 'поезд'],
      ['sb-14', 'Это мой поезд.', 'Eto moy poyezd.', 'This is my train.', 'машина'],
      ['sb-15', 'Вот стол.', 'Vot stol.', 'Here is a table.', 'окно'],
      ['sb-16', 'Вот окно.', 'Vot okno.', 'Here is a window.', 'стол'],
      ['sb-17', 'Я ем хлеб.', 'Ya yem khleb.', 'I eat bread.', 'яблоко'],
      ['sb-18', 'Я пью молоко.', 'Ya pyu moloko.', 'I drink milk.', 'воду'],
      ['sb-19', 'Я пью воду.', 'Ya pyu vodu.', 'I drink water.', 'чай'],
      ['sb-20', 'Я пью чай.', 'Ya pyu chay.', 'I drink tea.', 'молоко'],
      ['sb-21', 'Я ем яблоко.', 'Ya yem yabloko.', 'I eat an apple.', 'хлеб'],
      ['sb-22', 'Я вижу рыбу.', 'Ya vizhu rybu.', 'I see a fish.', 'кошку'],
      ['sb-23', 'У меня есть кот.', 'U menya yest kot.', 'I have a cat.', 'собака'],
      ['sb-24', 'У меня есть собака.', 'U menya yest sobaka.', 'I have a dog.', 'кот'],
    ])
  })

  it('reports malformed reconstruction, duplicate IDs, and reused distractors', () => {
    const first = SENTENCE_BUILDER_SENTENCES[0]
    expect(validateSentenceBuilderContent([
      first,
      { ...first, russian: 'Нет.', distractor: 'дом' },
    ])).toEqual(expect.arrayContaining([
      'sb-01 is duplicated',
      'sb-01 does not reconstruct its Russian sentence',
      'sb-01 uses a target token as its distractor',
    ]))
  })
})

describe('sentence builder tiles and grading', () => {
  const sentence = SENTENCE_BUILDER_SENTENCES[0]

  it('prevents solved two-token shuffles and gives occurrence IDs', () => {
    const tiles = buildSentenceTiles(sentence, 0, () => 0.999)
    expect(tiles.map((tile) => tile.value)).toEqual(['дом', 'Это'])
    expect(new Set(tiles.map((tile) => tile.id)).size).toBe(2)
  })

  it('fades the scaffold and adds the authored distractor at the exact levels', () => {
    expect([0, 1, 2, 3, 4, 5].map(getSentenceQuestionMode)).toEqual([
      { showTransliteration: true, includeDistractor: false },
      { showTransliteration: true, includeDistractor: false },
      { showTransliteration: false, includeDistractor: false },
      { showTransliteration: false, includeDistractor: false },
      { showTransliteration: false, includeDistractor: true },
      { showTransliteration: false, includeDistractor: true },
    ])
    expect(buildSentenceTiles(sentence, 3, () => 0)).toHaveLength(2)
    const high = buildSentenceTiles(sentence, 4, () => 0)
    expect(high).toHaveLength(3)
    expect(high.filter((tile) => !tile.target).map((tile) => tile.value)).toEqual(['книга'])
    expect(buildSentenceTiles(sentence, 5, () => 0)).toHaveLength(3)
  })

  it('grades exact authored order and count while punctuation stays outside the answer', () => {
    expect(gradeSentenceTokens(sentence, ['Это', 'дом'])).toBe(true)
    expect(gradeSentenceTokens(sentence, ['дом', 'Это'])).toBe(false)
    expect(gradeSentenceTokens(sentence, ['Это', 'дом', '.'])).toBe(false)
    expect(gradeSentenceTokens(sentence, ['Это', 'книга'])).toBe(false)
  })
})

describe('sentence builder scheduling and hydration', () => {
  it('uses shared intervals, immediate misses, and a two-item gap', () => {
    const now = 1_000_000
    let progress = createSentenceBuilderProgress(SENTENCE_BUILDER_SENTENCES, now)
    progress = recordSentenceAnswer(progress, 'sb-01', false, now)
    expect(progress.items['sb-01']).toMatchObject({ level: 0, nextDueAt: now, lapses: 1 })
    expect(selectNextSentenceId(SENTENCE_BUILDER_SENTENCES, progress, now, ['sb-01'])).toBe('sb-02')
    progress = recordSentenceAnswer(progress, 'sb-02', true, now)
    expect(selectNextSentenceId(SENTENCE_BUILDER_SENTENCES, progress, now, ['sb-01', 'sb-02'])).toBe('sb-03')
    progress = recordSentenceAnswer(progress, 'sb-03', true, now)
    expect(selectNextSentenceId(SENTENCE_BUILDER_SENTENCES, progress, now, ['sb-01', 'sb-02', 'sb-03'])).toBe('sb-01')

    progress = recordSentenceAnswer(progress, 'sb-01', true, now + 1)
    expect(progress.items['sb-01'].nextDueAt).toBe(now + 1 + SENTENCE_BUILDER_INTERVALS[1])
  })

  it('prioritises missed, low-level due sentences and weakest practice', () => {
    const now = 10_000
    let progress = createSentenceBuilderProgress(SENTENCE_BUILDER_SENTENCES, now)
    progress = recordSentenceAnswer(progress, 'sb-01', true, now)
    progress = recordSentenceAnswer(progress, 'sb-02', false, now + 1)
    expect(selectNextSentenceId(SENTENCE_BUILDER_SENTENCES, progress, now + 1)).toBe('sb-02')
    expect(selectWeakestSentenceId(SENTENCE_BUILDER_SENTENCES, progress)).toBe('sb-02')
  })

  it('preserves valid known items, repairs malformed ones, adds new items, and ignores unknown IDs', () => {
    const now = 50
    const valid = createSentenceBuilderProgress(SENTENCE_BUILDER_SENTENCES.slice(0, 2), now)
    const stored = {
      ...valid,
      items: {
        ...valid.items,
        'sb-01': { ...valid.items['sb-01'], attempts: 2, correctAttempts: 1 },
        'sb-02': { ...valid.items['sb-02'], level: 9 },
        removed: { ...valid.items['sb-01'] },
      },
    }
    const hydrated = hydrateSentenceBuilderProgress(stored, SENTENCE_BUILDER_SENTENCES.slice(0, 3), now + 1)
    expect(Object.keys(hydrated.items)).toEqual(['sb-01', 'sb-02', 'sb-03'])
    expect(hydrated.items['sb-01'].attempts).toBe(2)
    expect(hydrated.items['sb-02'].attempts).toBe(0)
    expect(hydrated.items['sb-03'].attempts).toBe(0)
    expect(hydrateSentenceBuilderProgress({ ...stored, version: 2 }, SENTENCE_BUILDER_SENTENCES).items['sb-01'].attempts).toBe(0)
  })
})
