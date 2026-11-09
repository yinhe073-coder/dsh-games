// 剧情文本表：8 夜完整台词 + 闪回做错变体 + 结局
// 改台词只改这里，不动引擎（一键可回退）
module.exports = {
  NIGHTS: [
    {
      n: 1,
      guest: 'ch_guest_peddler',
      name: '挑担货郎·老陈',
      enter: '掌勺的，来一碗，热的就行。',
      order: '一碗清汤面，不要葱，火别太大。',
      right: '葱果然一根没放。',
      wrong: '有点糊味，不打紧，走了一天路了。',
      close: '担子远了，灯笼晃了一下。',
      gain: 24,
      loss: 11
    },
    {
      n: 2,
      guest: 'ch_guest_courier',
      name: '跑信少年·阿元',
      enter: '有人在吗？我赶时间！',
      order: '一碗面，加菜，汤要滚！',
      right: '“滚”这个字你没省。',
      wrong: '汤是温的，路上凉得快。',
      close: '信筒擦过门框的一声轻响。',
      gain: 24,
      loss: 12
    },
    {
      n: 3,
      guest: 'ch_guest_granny',
      name: '卖伞的婆婆',
      enter: '……来一碗。',
      order: '最素的一碗，什么都别加，汤要热。',
      right: '这碗面，像我儿子做的。',
      wrong: '不碍事，热汤就好。',
      close: '门槛上的水迹，慢慢干了。',
      gain: 26,
      loss: 13,
      flash: 'flash_01'
    },
    {
      n: 4,
      guest: 'ch_guest_swordsman',
      name: '赶路的剑客',
      enter: '……三碗。',
      order: '三碗一起下，要快，都多放盐。',
      right: '你这手，是守夜的手。',
      wrong: '我赶路，不挑。',
      close: '桌边留着一道布裹长条的印子。',
      gain: 26,
      loss: 13
    },
    {
      n: 5,
      guest: 'ch_guest_kid',
      name: '送灯的孩子',
      enter: '……能、能分两个碗吗？',
      order: '一碗面，分两个碗，两个都要有蛋。',
      right: '他给我的蛋是圆的。',
      wrong: '谢谢你！',
      close: '雪在门口化了一圈水印。',
      gain: 26,
      loss: 13,
      flash: 'flash_02'
    },
    {
      n: 6,
      guest: 'ch_guest_clerk',
      name: '记性的账房',
      enter: '……我看看啊。',
      order: '照上回那个跑信少年的做法，但不要菜。',
      right: '记性比算盘准。你爷爷也这样。',
      wrong: '少一样也无妨，我记性也不好。',
      close: '算盘珠子轻轻响了一下。',
      gain: 26,
      loss: 13
    },
    {
      n: 7,
      guest: 'ch_guest_stranger',
      name: '无名黑衣人',
      enter: '……',
      order: '随你。',
      right: '他等过一个人，等了很多夜。走时停了半步，回头看了一眼，没有出声。',
      wrong: '……',
      close: '风把灯吹低了一点，又亮回来。',
      gain: 28,
      loss: 14,
      flash: 'flash_03'
    },
    {
      n: 8,
      guest: 'ch_guest_xian_01',
      name: '云海老客',
      enter: '这副筷子，先摆着。',
      order: '两碗，一碗摆着别动。',
      right: '他等的不是这一碗，是有人接着守这盏灯。',
      wrong: '不碍事，我替他摆。',
      close: '云海退了一线，灯还亮着。',
      gain: 30,
      loss: 15,
      final: true
    }
  ],

  // 闪回做错时用的轻说法（做对用 config.FLASH_TEXT）
  FLASH_ALT: {
    flash_01: '那晚他没说话，只是把伞倾得更低。',
    flash_02: '那晚分面的时候，他手抖了一下。',
    flash_03: '那晚，那副筷子他摆了很久。'
  },

  // 结局五段（第四句回收第 4 夜「把碗摞好」的伏笔）
  ENDING: [
    '旧友喝完自己那碗，把空位那碗推到你面前：',
    '「这碗，你替他吃。」',
    '你端起碗。云海在脚边退开一线，灯还亮着。',
    '桌上的碗，摆得很齐。',
    '守夜的人不问客人从哪来，只问面够不够热。'
  ]
};
