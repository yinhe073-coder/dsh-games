// 全局常量（设计坐标：宽固定 750，高随设备 1334~1626）
module.exports = {
  DESIGN_W: 750,
  DESIGN_H: 1334,
  BG_W: 750,
  BG_H: 1626,

  // 安全区（750 设计坐标，见契约 §一·补）
  SAFE_TOP: 120,
  SAFE_BOTTOM: 1254,
  CAPSULE: { x: 562, y: 48, w: 174, h: 64 },
  MARGIN: 40,

  FONT: 'sans-serif',

  // 《健康游戏忠告》全文（官方 3.2.6 原文，一字不改，含标点）
  HEALTH_ADVICE:
    '抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。',

  GAME_NAME: '九重云外小面馆',
  AGE_TIP: '适龄提示：8+',

  // 信息页字段（铺货席 2026-11-08 定稿；实际号下来后只改这里）
  INFO: {
    version: '0.1.0',
    author: '（本人姓名，与账号主体一致）',
    publish: '暂无（本游戏尚未取得版号）',
    record: '备案办理中',
    note: '纯广告变现，不提供虚拟支付或内购'
  },

  // 背景地面线（素材席实测，750×1626 坐标，横坐标左上为原点）——每张背景不同，不能用固定值
  GROUND_Y: {
    bg_tian_dusk: 1300,
    bg_tian_cloud: 1290,
    bg_noodle_night: 1460,
    bg_noodle_rain: 1440,
    bg_noodle_close: 1410,
    bg_noodle_dusk: 1430
  },
  // 默认站位 x：主角居中偏右，客人偏左
  STAND_X: { owner: 500, guest: 250 },
  // 通用落地软影（10 张立绘共用一张）
  SHADOW: { key: 'shadow_soft', scale: 0.55, ratio: 96 / 256, alpha: 0.75, lift: 2 },

  // 闪回字幕（分段 key → 旁白）
  FLASH_TEXT: {
    flash_01: '雨夜旧巷，他把伞整个往她那边倾。',
    flash_02: '大雪夜，一碗面分成两碗，两个孩子捧着没撒手。',
    flash_03: '云外最后一夜，他摆好一副空筷，把蛋单独放在小碟里。'
  },

  // 包体硬线
  LIMITS: { MAIN_PACKAGE_MB: 4, TOTAL_PACKAGE_MB: 20 },

  // IAA 广告四条硬线（铺货席 2026-11-08），接 SDK 时必须遵守：
  // 首屏不弹、不挡开始按钮、广告展示占比 ≤50%、不强制看广告解锁
  ADS: { noLaunchAd: true, noCoverStart: true, maxRatio: 0.5, optionalOnly: true }
};
