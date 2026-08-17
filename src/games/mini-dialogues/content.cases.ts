import { describe, expect, it } from 'vitest'
import { MINI_DIALOGUES, validateMiniDialogues } from './content'

const EXACT_CORE = [
  ['md-01', 'Meeting a friend', 'Привет!', 'Привет!', 'Hi!', 'Hi!'],
  ['md-02', 'Entering a shop', 'Здравствуйте!', 'Здравствуйте!', 'Hello!', 'Hello!'],
  ['md-03', 'Checking in', 'Как дела?', 'Хорошо, спасибо.', 'How are things?', 'Good, thank you.'],
  ['md-04', 'Introductions', 'Как тебя зовут?', 'Меня зовут Анна.', 'What is your name?', 'My name is Anna.'],
  ['md-05', 'Introductions', 'Очень приятно.', 'Мне тоже.', 'Nice to meet you.', 'Likewise.'],
  ['md-06', 'Receiving thanks', 'Спасибо!', 'Пожалуйста.', 'Thank you!', 'You’re welcome.'],
  ['md-07', 'A small accident', 'Извините.', 'Ничего страшного.', 'Sorry.', 'No problem.'],
  ['md-08', 'Language ability', 'Ты говоришь по-английски?', 'Да, немного.', 'Do you speak English?', 'Yes, a little.'],
  ['md-09', 'Checking understanding', 'Вы понимаете?', 'Нет, не понимаю.', 'Do you understand?', 'No, I don’t understand.'],
  ['md-10', 'Asking for repetition', 'Это улица Арбат.', 'Повторите, пожалуйста.', 'This is Arbat Street.', 'Please repeat.'],
  ['md-11', 'Asking directions', 'Где метро?', 'Метро там.', 'Where is the metro?', 'The metro is there.'],
  ['md-12', 'Buying transport', 'Вам нужен билет?', 'Да, пожалуйста.', 'Do you need a ticket?', 'Yes, please.'],
  ['md-13', 'Ordering a drink', 'Что вы будете пить?', 'Чай, пожалуйста.', 'What will you drink?', 'Tea, please.'],
  ['md-14', 'Accepting water', 'Хотите воду?', 'Да, спасибо.', 'Would you like water?', 'Yes, thank you.'],
  ['md-15', 'Asking a price', 'Сколько это стоит?', 'Сто рублей.', 'How much does this cost?', 'One hundred rubles.'],
  ['md-16', 'Asking the time', 'Который час?', 'Сейчас три часа.', 'What time is it?', 'It is three o’clock now.'],
  ['md-17', 'Saying goodbye', 'До свидания!', 'До свидания!', 'Goodbye!', 'Goodbye!'],
  ['md-18', 'Until tomorrow', 'До завтра!', 'До завтра!', 'See you tomorrow!', 'See you tomorrow!'],
]

describe('Mini Dialogues authored content', () => {
  it('contains the exact 18-row core table in authored order', () => {
    expect(MINI_DIALOGUES.map(({ id, setting, prompt, reply, promptEnglish, replyEnglish }) =>
      [id, setting, prompt, reply, promptEnglish, replyEnglish])).toEqual(EXACT_CORE)
  })

  it('populates every authored support field and has unambiguous sourced options', () => {
    expect(validateMiniDialogues()).toEqual([])
    for (const dialogue of MINI_DIALOGUES) {
      expect(dialogue.promptLatin).not.toBe('')
      expect(dialogue.replyLatin).not.toBe('')
      expect(dialogue.explanation).toMatch(/\.$/)
      expect(dialogue.explanation.split(/[.!?]/).filter(Boolean)).toHaveLength(1)
      expect(dialogue.distractors).toHaveLength(3)
      expect(new Set([dialogue.reply, ...dialogue.distractors]).size).toBe(4)
    }
  })
})
