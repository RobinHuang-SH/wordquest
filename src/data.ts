export type Word = {
  word: string
  phonetic: string
  pos: string
  meaning: string
  definition: string
  example: string
  exampleZh: string
  collocations: string[]
  level: string
  review?: boolean
}

export const todayWords: Word[] = [
  {
    word: 'discover',
    phonetic: '/dɪˈskʌvər/',
    pos: 'v.',
    meaning: '发现',
    definition: 'to find something for the first time',
    example: 'Mia discovered a hidden door.',
    exampleZh: '米娅发现了一扇隐藏的门。',
    collocations: ['discover a secret', 'discover the truth'],
    level: 'A2',
  },
  {
    word: 'ancient',
    phonetic: '/ˈeɪnʃənt/',
    pos: 'adj.',
    meaning: '古老的',
    definition: 'belonging to a time long ago',
    example: 'An ancient map lay on the table.',
    exampleZh: '一张古老的地图放在桌上。',
    collocations: ['ancient city', 'ancient history'],
    level: 'A2',
  },
  {
    word: 'signal',
    phonetic: '/ˈsɪɡnəl/',
    pos: 'n.',
    meaning: '信号',
    definition: 'a sign that gives information',
    example: 'A blue light sent a signal.',
    exampleZh: '一道蓝光发出了信号。',
    collocations: ['send a signal', 'warning signal'],
    level: 'A2',
  },
  {
    word: 'courage',
    phonetic: '/ˈkɜːrɪdʒ/',
    pos: 'n.',
    meaning: '勇气',
    definition: 'the ability to face fear',
    example: 'She found the courage to enter.',
    exampleZh: '她鼓起勇气走了进去。',
    collocations: ['show courage', 'great courage'],
    level: 'B1',
  },
  {
    word: 'whisper',
    phonetic: '/ˈwɪspər/',
    pos: 'v.',
    meaning: '低声说',
    definition: 'to speak very quietly',
    example: '“Follow me,” he whispered.',
    exampleZh: '“跟我来，”他低声说道。',
    collocations: ['whisper softly', 'whisper a name'],
    level: 'A2',
  },
  {
    word: 'path',
    phonetic: '/pæθ/',
    pos: 'n.',
    meaning: '小路；路径',
    definition: 'a way made for walking',
    example: 'The path led into the forest.',
    exampleZh: '小路通向森林深处。',
    collocations: ['narrow path', 'follow a path'],
    level: 'A1',
    review: true,
  },
  {
    word: 'hidden',
    phonetic: '/ˈhɪdn/',
    pos: 'adj.',
    meaning: '隐藏的',
    definition: 'kept out of sight',
    example: 'They found a hidden room.',
    exampleZh: '他们找到了一个隐藏的房间。',
    collocations: ['hidden door', 'hidden meaning'],
    level: 'A2',
  },
  {
    word: 'glow',
    phonetic: '/ɡloʊ/',
    pos: 'v.',
    meaning: '发光',
    definition: 'to produce a soft steady light',
    example: 'The stone began to glow.',
    exampleZh: '石头开始发出微光。',
    collocations: ['glow brightly', 'soft glow'],
    level: 'A2',
  },
  {
    word: 'strange',
    phonetic: '/streɪndʒ/',
    pos: 'adj.',
    meaning: '奇怪的',
    definition: 'unusual or unexpected',
    example: 'A strange sound came from below.',
    exampleZh: '下方传来一个奇怪的声音。',
    collocations: ['feel strange', 'strange sound'],
    level: 'A1',
    review: true,
  },
  {
    word: 'protect',
    phonetic: '/prəˈtekt/',
    pos: 'v.',
    meaning: '保护',
    definition: 'to keep safe from harm',
    example: 'The wall protects the village.',
    exampleZh: '城墙保护着村庄。',
    collocations: ['protect from', 'protect nature'],
    level: 'A2',
  },
  {
    word: 'promise',
    phonetic: '/ˈprɑːmɪs/',
    pos: 'n./v.',
    meaning: '承诺',
    definition: 'to say that you will certainly do something',
    example: 'I promise to return before dark.',
    exampleZh: '我保证天黑前回来。',
    collocations: ['keep a promise', 'make a promise'],
    level: 'A2',
  },
  {
    word: 'journey',
    phonetic: '/ˈdʒɜːrni/',
    pos: 'n.',
    meaning: '旅程',
    definition: 'an act of travelling from one place to another',
    example: 'Their journey began at sunrise.',
    exampleZh: '他们的旅程始于日出。',
    collocations: ['long journey', 'begin a journey'],
    level: 'A2',
    review: true,
  },
  {
    word: 'careful',
    phonetic: '/ˈkerfəl/',
    pos: 'adj.',
    meaning: '小心的',
    definition: 'giving attention to avoid danger',
    example: 'Be careful near the old bridge.',
    exampleZh: '靠近旧桥时要小心。',
    collocations: ['be careful', 'careful plan'],
    level: 'A1',
  },
  {
    word: 'decide',
    phonetic: '/dɪˈsaɪd/',
    pos: 'v.',
    meaning: '决定',
    definition: 'to choose after thinking',
    example: 'We must decide before noon.',
    exampleZh: '我们必须在中午前做决定。',
    collocations: ['decide to', 'decide between'],
    level: 'A2',
  },
  {
    word: 'entrance',
    phonetic: '/ˈentrəns/',
    pos: 'n.',
    meaning: '入口',
    definition: 'a door or way into a place',
    example: 'Vines covered the entrance.',
    exampleZh: '藤蔓遮住了入口。',
    collocations: ['main entrance', 'secret entrance'],
    level: 'A2',
  },
  {
    word: 'message',
    phonetic: '/ˈmesɪdʒ/',
    pos: 'n.',
    meaning: '信息；口信',
    definition: 'information sent to someone',
    example: 'The map carried a message.',
    exampleZh: '地图上带着一条信息。',
    collocations: ['send a message', 'secret message'],
    level: 'A1',
    review: true,
  },
  {
    word: 'shadow',
    phonetic: '/ˈʃædoʊ/',
    pos: 'n.',
    meaning: '影子',
    definition: 'a dark shape made when light is blocked',
    example: 'A shadow moved behind the tree.',
    exampleZh: '一个影子在树后移动。',
    collocations: ['dark shadow', 'in the shadow'],
    level: 'A2',
  },
  {
    word: 'suddenly',
    phonetic: '/ˈsʌdənli/',
    pos: 'adv.',
    meaning: '突然',
    definition: 'quickly and unexpectedly',
    example: 'Suddenly, the ground shook.',
    exampleZh: '突然，地面震动起来。',
    collocations: ['stop suddenly', 'suddenly appear'],
    level: 'A2',
  },
  {
    word: 'trust',
    phonetic: '/trʌst/',
    pos: 'v.',
    meaning: '信任',
    definition: 'to believe that someone is honest',
    example: 'You can trust your oldest friend.',
    exampleZh: '你可以信任你最老的朋友。',
    collocations: ['trust someone', 'build trust'],
    level: 'A2',
    review: true,
  },
  {
    word: 'escape',
    phonetic: '/ɪˈskeɪp/',
    pos: 'v.',
    meaning: '逃脱',
    definition: 'to get free from a dangerous place',
    example: 'They escaped through the window.',
    exampleZh: '他们从窗户逃了出去。',
    collocations: ['escape from', 'narrow escape'],
    level: 'A2',
  },
]

export type StoryLength = 'short' | 'medium' | 'long'

export type StoryParagraph = {
  en: string
  zh: string
}

export const storyVariants: Record<StoryLength, StoryParagraph[]> = {
  short: [
    {
      en: `At sunrise, Mia began a journey on the forest path with an ancient map and a final message from her grandfather. A strange blue signal began to glow beside a hidden entrance. “Be careful,” Leo whispered as a shadow crossed the trees. Mia chose to trust him, found her courage, and stepped inside without looking back.`,
      zh: `日出时，米娅带着一张古老地图和祖父最后的信息，踏上了森林小路。一道奇怪的蓝色信号在隐藏入口旁开始发光。“小心，”利奥在影子掠过树林时低声说道。米娅选择信任他，鼓起勇气走了进去。`,
    },
    {
      en: `They discovered a silver machine playing her grandfather's promise: “Protect this place.” Suddenly, the door closed. Mia had to decide fast. She touched the bright stone, opened another entrance, and helped them escape. Beyond it, a second path waited, carrying the signal deeper underground.`,
      zh: `他们发现一台银色机器正在播放祖父的承诺：“保护这里。”突然，门关上了。米娅必须迅速决定。她触碰亮起的石头，打开另一个入口，帮助两人逃脱。外面还有第二条路，带着信号通往更深的地下。`,
    },
  ],
  medium: [
    {
      en: `At sunrise, Mia began a new journey along the forest path. In her pocket was an ancient map, a final message from her grandfather. It showed a hidden entrance beneath the old observatory, but the ink around it seemed newer than the rest of the map.`,
      zh: `日出时，米娅沿着森林小路开始了新的旅程。她口袋里装着祖父留下的古老地图和最后的信息。地图标出了旧观测站下方一个隐藏的入口，但入口周围的墨迹似乎比地图其他部分更新。`,
    },
    {
      en: `As she reached the hill, a strange blue signal began to glow on the map. “Be careful,” her friend Leo whispered. A tall shadow moved between the trees, but Mia chose to trust him and continue. They followed fresh footprints until the observatory rose through the mist.`,
      zh: `当她到达山丘时，地图上开始闪烁奇怪的蓝色信号。“小心，”朋友利奥低声说。一个高大的影子在树林间移动，但米娅选择信任他并继续前进。他们沿着新鲜脚印前行，直到观测站从雾中显现。`,
    },
    {
      en: `Inside, they discovered a room full of silver machines and glass tubes. One machine played her grandfather's promise: “Protect this place. The city may need its light.” Suddenly, the door closed behind them, and a red lamp began counting down from sixty.`,
      zh: `在观测站内，他们发现了一个摆满银色机器和玻璃管的房间。一台机器播放着祖父的承诺：“保护这里，这座城市或许会需要它的光。”突然，门在他们身后关上，一盏红灯开始从六十倒数。`,
    },
    {
      en: `Mia had to decide quickly. With courage, she touched the brightest stone. The wall opened just enough for them to escape—but beyond it waited a second path, leading deeper underground. Before following it, she copied the signal into her notebook so they could find their way back.`,
      zh: `米娅必须迅速做出决定。她鼓起勇气触碰最亮的石头。墙壁打开了一条缝，让他们得以逃脱——但外面还有第二条路，通往更深的地下。继续前，她把信号抄进笔记本，以便找到回来的路。`,
    },
  ],
  long: [
    {
      en: `At sunrise, Mia began a new journey along the forest path. In her pocket was an ancient map and a final message from her grandfather. It showed a hidden entrance beneath the old observatory, but the ink around it seemed newer than the rest. Her grandfather had vanished three years ago, and this was the first clue that felt meant for her.`,
      zh: `日出时，米娅沿着森林小路开始了新的旅程。她口袋里装着一张古老地图和祖父最后的信息。地图标出了旧观测站下方一个隐藏的入口，但入口周围的墨迹似乎更新。祖父三年前失踪了，这是第一条像是专门留给她的线索。`,
    },
    {
      en: `As she reached the hill, a strange blue signal began to glow on the map. “Be careful,” her friend Leo whispered. A tall shadow moved between the trees, but Mia chose to trust him and continue. They followed fresh footprints through wet ferns until the observatory's broken tower rose above the mist.`,
      zh: `当她到达山丘时，地图上开始闪烁奇怪的蓝色信号。“小心，”朋友利奥低声说。一个高大的影子在树林间移动，但米娅选择信任他并继续前进。他们沿着穿过湿蕨丛的新鲜脚印前行，直到观测站破损的塔楼升出雾气。`,
    },
    {
      en: `Inside, they discovered a room full of silver machines, glass tubes, and star charts. One machine played her grandfather's promise: “Protect this place. The city may need its light.” Suddenly, the door closed behind them, a red lamp began counting down, and metal shutters covered every window.`,
      zh: `在观测站内，他们发现了一个摆满银色机器、玻璃管和星图的房间。一台机器播放着祖父的承诺：“保护这里，这座城市或许会需要它的光。”突然，门在他们身后关上，红灯开始倒数，金属百叶封住了每扇窗。`,
    },
    {
      en: `Mia had to decide quickly. With courage, she touched the brightest stone. The wall opened just enough for them to escape—but beyond it waited a second path, leading deeper underground. Before following it, she copied the signal into her notebook while Leo held the heavy stone door open.`,
      zh: `米娅必须迅速做出决定。她鼓起勇气触碰最亮的石头。墙壁打开了一条缝，让他们得以逃脱——但外面还有第二条路，通往更深的地下。继续前，她把信号抄进笔记本，利奥则撑着沉重的石门。`,
    },
    {
      en: `The tunnel carried warm air and the quiet rhythm of hidden engines. Symbols on the walls matched the ancient map, forming a record of lights seen above the city for hundreds of years. Mia realized the observatory had never watched the stars; it had watched something moving below the forest.`,
      zh: `隧道里流动着暖风和隐藏引擎的轻微节奏。墙上的符号与古老地图吻合，记录着数百年来城市上空出现的光。米娅意识到，观测站从未真正观察星星；它一直在监视森林下方移动的东西。`,
    },
    {
      en: `At the next chamber, the blue light divided into three directions. One route led toward the city's power station, another returned beneath the silver machine, and the last followed the unknown shadow. Mia understood why her grandfather had left a choice instead of an order: only she could judge which danger mattered first.`,
      zh: `在下一间石室里，蓝光分成三个方向。一条通往城市发电站，一条返回银色机器下方，最后一条追随着未知的影子。米娅明白祖父为何留下选择而不是命令：只有她能判断哪种危险最需要优先处理。`,
    },
  ],
}

export const storyChoices = [
  {
    id: 'underground',
    icon: '🗝️',
    title: '进入地下通道',
    en: 'Follow the underground path',
    hint: '寻找信号的真正来源',
  },
  {
    id: 'machine',
    icon: '⚙️',
    title: '返回研究机器',
    en: 'Return to study the machine',
    hint: '破解祖父留下的信息',
  },
  {
    id: 'shadow',
    icon: '🌲',
    title: '追踪森林黑影',
    en: 'Track the shadow in the forest',
    hint: '查明是谁一路跟随',
  },
]
