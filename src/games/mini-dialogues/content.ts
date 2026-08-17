export interface MiniDialogue {
  id: string
  setting: string
  prompt: string
  reply: string
  promptLatin: string
  replyLatin: string
  promptEnglish: string
  replyEnglish: string
  explanation: string
  distractors: readonly [string, string, string]
}

export const MINI_DIALOGUES: readonly MiniDialogue[] = [
  {
    id: 'md-01', setting: 'Meeting a friend', prompt: 'Привет!', reply: 'Привет!',
    promptLatin: 'Privet!', replyLatin: 'Privet!', promptEnglish: 'Hi!', replyEnglish: 'Hi!',
    explanation: 'Returning the same friendly greeting is a natural response here.',
    distractors: ['Сто рублей.', 'Метро там.', 'Сейчас три часа.'],
  },
  {
    id: 'md-02', setting: 'Entering a shop', prompt: 'Здравствуйте!', reply: 'Здравствуйте!',
    promptLatin: 'Zdravstvuyte!', replyLatin: 'Zdravstvuyte!', promptEnglish: 'Hello!', replyEnglish: 'Hello!',
    explanation: 'Returning this polite greeting is appropriate when entering a shop.',
    distractors: ['Меня зовут Анна.', 'До завтра!', 'Чай, пожалуйста.'],
  },
  {
    id: 'md-03', setting: 'Checking in', prompt: 'Как дела?', reply: 'Хорошо, спасибо.',
    promptLatin: 'Kak dela?', replyLatin: 'Khorosho, spasibo.', promptEnglish: 'How are things?', replyEnglish: 'Good, thank you.',
    explanation: 'This reply answers the question about how things are going.',
    distractors: ['Метро там.', 'Сто рублей.', 'Меня зовут Анна.'],
  },
  {
    id: 'md-04', setting: 'Introductions', prompt: 'Как тебя зовут?', reply: 'Меня зовут Анна.',
    promptLatin: 'Kak tebya zovut?', replyLatin: 'Menya zovut Anna.', promptEnglish: 'What is your name?', replyEnglish: 'My name is Anna.',
    explanation: 'This reply directly gives the speaker’s name.',
    distractors: ['Сто рублей.', 'Метро там.', 'Да, немного.'],
  },
  {
    id: 'md-05', setting: 'Introductions', prompt: 'Очень приятно.', reply: 'Мне тоже.',
    promptLatin: 'Ochen priyatno.', replyLatin: 'Mne tozhe.', promptEnglish: 'Nice to meet you.', replyEnglish: 'Likewise.',
    explanation: 'This reply returns the pleasure expressed by the other speaker.',
    distractors: ['Метро там.', 'Сто рублей.', 'Чай, пожалуйста.'],
  },
  {
    id: 'md-06', setting: 'Receiving thanks', prompt: 'Спасибо!', reply: 'Пожалуйста.',
    promptLatin: 'Spasibo!', replyLatin: 'Pozhaluysta.', promptEnglish: 'Thank you!', replyEnglish: 'You’re welcome.',
    explanation: 'This is the usual polite response to thanks.',
    distractors: ['Сейчас три часа.', 'Метро там.', 'Меня зовут Анна.'],
  },
  {
    id: 'md-07', setting: 'A small accident', prompt: 'Извините.', reply: 'Ничего страшного.',
    promptLatin: 'Izvinite.', replyLatin: 'Nichego strashnogo.', promptEnglish: 'Sorry.', replyEnglish: 'No problem.',
    explanation: 'This reply reassures the person that the accident is not serious.',
    distractors: ['Сто рублей.', 'Чай, пожалуйста.', 'Сейчас три часа.'],
  },
  {
    id: 'md-08', setting: 'Language ability', prompt: 'Ты говоришь по-английски?', reply: 'Да, немного.',
    promptLatin: 'Ty govorish po-angliyski?', replyLatin: 'Da, nemnogo.', promptEnglish: 'Do you speak English?', replyEnglish: 'Yes, a little.',
    explanation: 'This reply states that the speaker has a little English ability.',
    distractors: ['Сто рублей.', 'Метро там.', 'До завтра!'],
  },
  {
    id: 'md-09', setting: 'Checking understanding', prompt: 'Вы понимаете?', reply: 'Нет, не понимаю.',
    promptLatin: 'Vy ponimayete?', replyLatin: 'Net, ne ponimayu.', promptEnglish: 'Do you understand?', replyEnglish: 'No, I don’t understand.',
    explanation: 'This reply clearly says that the speaker does not understand.',
    distractors: ['Сто рублей.', 'Меня зовут Анна.', 'Чай, пожалуйста.'],
  },
  {
    id: 'md-10', setting: 'Asking for repetition', prompt: 'Это улица Арбат.', reply: 'Повторите, пожалуйста.',
    promptLatin: 'Eto ulitsa Arbat.', replyLatin: 'Povtorite, pozhaluysta.', promptEnglish: 'This is Arbat Street.', replyEnglish: 'Please repeat.',
    explanation: 'This request asks the other speaker to say the information again.',
    distractors: ['Сто рублей.', 'Метро там.', 'Сейчас три часа.'],
  },
  {
    id: 'md-11', setting: 'Asking directions', prompt: 'Где метро?', reply: 'Метро там.',
    promptLatin: 'Gde metro?', replyLatin: 'Metro tam.', promptEnglish: 'Where is the metro?', replyEnglish: 'The metro is there.',
    explanation: 'This reply answers the location question by pointing out the metro.',
    distractors: ['Хорошо, спасибо.', 'Меня зовут Анна.', 'Сто рублей.'],
  },
  {
    id: 'md-12', setting: 'Buying transport', prompt: 'Вам нужен билет?', reply: 'Да, пожалуйста.',
    promptLatin: 'Vam nuzhen bilet?', replyLatin: 'Da, pozhaluysta.', promptEnglish: 'Do you need a ticket?', replyEnglish: 'Yes, please.',
    explanation: 'This reply politely accepts the offered ticket.',
    distractors: ['Метро там.', 'Ничего страшного.', 'Сейчас три часа.'],
  },
  {
    id: 'md-13', setting: 'Ordering a drink', prompt: 'Что вы будете пить?', reply: 'Чай, пожалуйста.',
    promptLatin: 'Chto vy budete pit?', replyLatin: 'Chay, pozhaluysta.', promptEnglish: 'What will you drink?', replyEnglish: 'Tea, please.',
    explanation: 'This reply names the drink being ordered.',
    distractors: ['Метро там.', 'Меня зовут Анна.', 'До завтра!'],
  },
  {
    id: 'md-14', setting: 'Accepting water', prompt: 'Хотите воду?', reply: 'Да, спасибо.',
    promptLatin: 'Khotite vodu?', replyLatin: 'Da, spasibo.', promptEnglish: 'Would you like water?', replyEnglish: 'Yes, thank you.',
    explanation: 'This reply politely accepts the offer of water.',
    distractors: ['Сто рублей.', 'Меня зовут Анна.', 'До свидания!'],
  },
  {
    id: 'md-15', setting: 'Asking a price', prompt: 'Сколько это стоит?', reply: 'Сто рублей.',
    promptLatin: 'Skolko eto stoit?', replyLatin: 'Sto rubley.', promptEnglish: 'How much does this cost?', replyEnglish: 'One hundred rubles.',
    explanation: 'This reply gives a price in rubles.',
    distractors: ['Метро там.', 'Чай, пожалуйста.', 'Меня зовут Анна.'],
  },
  {
    id: 'md-16', setting: 'Asking the time', prompt: 'Который час?', reply: 'Сейчас три часа.',
    promptLatin: 'Kotoryy chas?', replyLatin: 'Seychas tri chasa.', promptEnglish: 'What time is it?', replyEnglish: 'It is three o’clock now.',
    explanation: 'This reply states the current time.',
    distractors: ['Сто рублей.', 'Чай, пожалуйста.', 'Метро там.'],
  },
  {
    id: 'md-17', setting: 'Saying goodbye', prompt: 'До свидания!', reply: 'До свидания!',
    promptLatin: 'Do svidaniya!', replyLatin: 'Do svidaniya!', promptEnglish: 'Goodbye!', replyEnglish: 'Goodbye!',
    explanation: 'Returning the same farewell is a natural way to end the conversation.',
    distractors: ['Сто рублей.', 'Меня зовут Анна.', 'Чай, пожалуйста.'],
  },
  {
    id: 'md-18', setting: 'Until tomorrow', prompt: 'До завтра!', reply: 'До завтра!',
    promptLatin: 'Do zavtra!', replyLatin: 'Do zavtra!', promptEnglish: 'See you tomorrow!', replyEnglish: 'See you tomorrow!',
    explanation: 'Returning this farewell confirms that the speakers expect to meet tomorrow.',
    distractors: ['Сто рублей.', 'Метро там.', 'Сейчас три часа.'],
  },
] as const

export function validateMiniDialogues(dialogues: readonly MiniDialogue[] = MINI_DIALOGUES): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  const replies = new Map<string, string[]>()

  for (const dialogue of dialogues) {
    const values = [dialogue.id, dialogue.setting, dialogue.prompt, dialogue.reply,
      dialogue.promptLatin, dialogue.replyLatin, dialogue.promptEnglish,
      dialogue.replyEnglish, dialogue.explanation, ...dialogue.distractors]
    if (values.some((value) => value.trim().length === 0)) errors.push(`${dialogue.id || 'unknown'} has an empty required field`)
    if (ids.has(dialogue.id)) errors.push(`${dialogue.id} is duplicated`)
    ids.add(dialogue.id)
    if (dialogue.distractors.length !== 3) errors.push(`${dialogue.id} must have three distractors`)
    const options = [dialogue.reply, ...dialogue.distractors]
    if (new Set(options).size !== 4) errors.push(`${dialogue.id} has duplicate visible options`)
    if (dialogue.distractors.includes(dialogue.reply)) errors.push(`${dialogue.id} reuses its reply as a distractor`)
    for (const reply of [dialogue.reply]) replies.set(reply, [...(replies.get(reply) ?? []), dialogue.id])
  }

  for (const dialogue of dialogues) {
    for (const distractor of dialogue.distractors) {
      const sourceIds = replies.get(distractor) ?? []
      if (!sourceIds.some((id) => id !== dialogue.id)) errors.push(`${dialogue.id} has an unauthored distractor: ${distractor}`)
    }
  }
  return errors
}

const contentErrors = validateMiniDialogues()
if (contentErrors.length > 0) throw new Error(`Invalid Mini Dialogues content: ${contentErrors.join('; ')}`)
