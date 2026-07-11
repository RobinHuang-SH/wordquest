export type Word = {
  word: string; phonetic: string; pos: string; meaning: string;
  definition: string; example: string; exampleZh: string; collocations: string[];
  level: string; review?: boolean;
}

export const todayWords: Word[] = [
  { word:'discover', phonetic:'/dɪˈskʌvər/', pos:'v.', meaning:'发现', definition:'to find something for the first time', example:'Mia discovered a hidden door.', exampleZh:'米娅发现了一扇隐藏的门。', collocations:['discover a secret','discover the truth'], level:'A2' },
  { word:'ancient', phonetic:'/ˈeɪnʃənt/', pos:'adj.', meaning:'古老的', definition:'belonging to a time long ago', example:'An ancient map lay on the table.', exampleZh:'一张古老的地图放在桌上。', collocations:['ancient city','ancient history'], level:'A2' },
  { word:'signal', phonetic:'/ˈsɪɡnəl/', pos:'n.', meaning:'信号', definition:'a sign that gives information', example:'A blue light sent a signal.', exampleZh:'一道蓝光发出了信号。', collocations:['send a signal','warning signal'], level:'A2' },
  { word:'courage', phonetic:'/ˈkɜːrɪdʒ/', pos:'n.', meaning:'勇气', definition:'the ability to face fear', example:'She found the courage to enter.', exampleZh:'她鼓起勇气走了进去。', collocations:['show courage','great courage'], level:'B1' },
  { word:'whisper', phonetic:'/ˈwɪspər/', pos:'v.', meaning:'低声说', definition:'to speak very quietly', example:'“Follow me,” he whispered.', exampleZh:'“跟我来，”他低声说道。', collocations:['whisper softly','whisper a name'], level:'A2' },
  { word:'path', phonetic:'/pæθ/', pos:'n.', meaning:'小路；路径', definition:'a way made for walking', example:'The path led into the forest.', exampleZh:'小路通向森林深处。', collocations:['narrow path','follow a path'], level:'A1', review:true },
  { word:'hidden', phonetic:'/ˈhɪdn/', pos:'adj.', meaning:'隐藏的', definition:'kept out of sight', example:'They found a hidden room.', exampleZh:'他们找到了一个隐藏的房间。', collocations:['hidden door','hidden meaning'], level:'A2' },
  { word:'glow', phonetic:'/ɡloʊ/', pos:'v.', meaning:'发光', definition:'to produce a soft steady light', example:'The stone began to glow.', exampleZh:'石头开始发出微光。', collocations:['glow brightly','soft glow'], level:'A2' },
  { word:'strange', phonetic:'/streɪndʒ/', pos:'adj.', meaning:'奇怪的', definition:'unusual or unexpected', example:'A strange sound came from below.', exampleZh:'下方传来一个奇怪的声音。', collocations:['feel strange','strange sound'], level:'A1', review:true },
  { word:'protect', phonetic:'/prəˈtekt/', pos:'v.', meaning:'保护', definition:'to keep safe from harm', example:'The wall protects the village.', exampleZh:'城墙保护着村庄。', collocations:['protect from','protect nature'], level:'A2' },
  { word:'promise', phonetic:'/ˈprɑːmɪs/', pos:'n./v.', meaning:'承诺', definition:'to say that you will certainly do something', example:'I promise to return before dark.', exampleZh:'我保证天黑前回来。', collocations:['keep a promise','make a promise'], level:'A2' },
  { word:'journey', phonetic:'/ˈdʒɜːrni/', pos:'n.', meaning:'旅程', definition:'an act of travelling from one place to another', example:'Their journey began at sunrise.', exampleZh:'他们的旅程始于日出。', collocations:['long journey','begin a journey'], level:'A2', review:true },
  { word:'careful', phonetic:'/ˈkerfəl/', pos:'adj.', meaning:'小心的', definition:'giving attention to avoid danger', example:'Be careful near the old bridge.', exampleZh:'靠近旧桥时要小心。', collocations:['be careful','careful plan'], level:'A1' },
  { word:'decide', phonetic:'/dɪˈsaɪd/', pos:'v.', meaning:'决定', definition:'to choose after thinking', example:'We must decide before noon.', exampleZh:'我们必须在中午前做决定。', collocations:['decide to','decide between'], level:'A2' },
  { word:'entrance', phonetic:'/ˈentrəns/', pos:'n.', meaning:'入口', definition:'a door or way into a place', example:'Vines covered the entrance.', exampleZh:'藤蔓遮住了入口。', collocations:['main entrance','secret entrance'], level:'A2' },
  { word:'message', phonetic:'/ˈmesɪdʒ/', pos:'n.', meaning:'信息；口信', definition:'information sent to someone', example:'The map carried a message.', exampleZh:'地图上带着一条信息。', collocations:['send a message','secret message'], level:'A1', review:true },
  { word:'shadow', phonetic:'/ˈʃædoʊ/', pos:'n.', meaning:'影子', definition:'a dark shape made when light is blocked', example:'A shadow moved behind the tree.', exampleZh:'一个影子在树后移动。', collocations:['dark shadow','in the shadow'], level:'A2' },
  { word:'suddenly', phonetic:'/ˈsʌdənli/', pos:'adv.', meaning:'突然', definition:'quickly and unexpectedly', example:'Suddenly, the ground shook.', exampleZh:'突然，地面震动起来。', collocations:['stop suddenly','suddenly appear'], level:'A2' },
  { word:'trust', phonetic:'/trʌst/', pos:'v.', meaning:'信任', definition:'to believe that someone is honest', example:'You can trust your oldest friend.', exampleZh:'你可以信任你最老的朋友。', collocations:['trust someone','build trust'], level:'A2', review:true },
  { word:'escape', phonetic:'/ɪˈskeɪp/', pos:'v.', meaning:'逃脱', definition:'to get free from a dangerous place', example:'They escaped through the window.', exampleZh:'他们从窗户逃了出去。', collocations:['escape from','narrow escape'], level:'A2' },
]

export const storyParagraphs = [
  `At sunrise, Mia began a new journey along the forest path. In her pocket was an ancient map, a final message from her grandfather. It showed a hidden entrance beneath the old observatory.`,
  `As she reached the hill, a strange blue signal began to glow on the map. “Be careful,” her friend Leo whispered. A tall shadow moved between the trees, but Mia chose to trust him and continue.`,
  `Inside the observatory, they discovered a room full of silver machines. One machine played her grandfather's promise: “Protect this place. The city may need its light.” Suddenly, the door closed behind them.`,
  `Mia had to decide quickly. With courage, she touched the brightest stone. The wall opened just enough for them to escape—but beyond it waited a second path, leading deeper underground.`
]

export const storyChoices = [
  { id:'underground', icon:'🗝️', title:'进入地下通道', en:'Follow the underground path', hint:'寻找信号的真正来源' },
  { id:'machine', icon:'⚙️', title:'返回研究机器', en:'Return to study the machine', hint:'破解祖父留下的信息' },
  { id:'shadow', icon:'🌲', title:'追踪森林黑影', en:'Track the shadow in the forest', hint:'查明是谁一路跟随' },
]
