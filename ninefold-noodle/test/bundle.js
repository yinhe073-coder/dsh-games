(function(){var __defs={},__cache={};function __req(id){if(__cache[id])return __cache[id].exports;var d=__defs[id];if(!d)throw new Error("module not found: "+id);var m={exports:{}};__cache[id]=m;d(m,m.exports,__req);return m.exports;}
__defs["src/config.js"]=function(module,exports,__req){
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

};
__defs["src/platform.js"]=function(module,exports,__req){
// 平台适配层：把 wx API 收在这一层，核心逻辑不直接碰 wx（契约 §一 入口形态）
const IS_WX =
  typeof wx !== 'undefined' && typeof wx.createCanvas === 'function';

let _canvas = null;

function mainCanvas() {
  if (_canvas) return _canvas;
  if (IS_WX) {
    _canvas =
      (typeof globalThis.canvas !== 'undefined' && globalThis.canvas) ||
      wx.createCanvas();
  } else {
    _canvas = document.getElementById('game');
  }
  return _canvas;
}

function viewport() {
  if (IS_WX) {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const safe = info.safeArea;
    const bottomInset = safe ? Math.max(0, info.screenHeight - safe.bottom) : 0;
    return {
      width: info.windowWidth,
      height: info.windowHeight,
      dpr: Math.min(info.pixelRatio || 2, 3),
      safeTop: safe ? safe.top : 0,
      safeBottom: bottomInset
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, 3),
    safeTop: 0,
    safeBottom: 0
  };
}

function createImage() {
  return IS_WX ? wx.createImage() : new Image();
}

function raf(cb) {
  return requestAnimationFrame(cb);
}

function now() {
  return Date.now();
}

function onResize(cb) {
  if (IS_WX) {
    if (wx.onWindowResize) wx.onWindowResize(cb);
  } else {
    window.addEventListener('resize', cb);
  }
}

function onTouch(cb) {
  if (IS_WX) {
    wx.onTouchStart((e) => cb('start', e.touches));
    wx.onTouchMove((e) => cb('move', e.touches));
    wx.onTouchEnd((e) => cb('end', e.changedTouches));
    wx.onTouchCancel((e) => cb('cancel', e.changedTouches));
    return;
  }
  const el = mainCanvas();
  const norm = (list) =>
    Array.prototype.map.call(list, (t) => ({
      clientX: t.clientX,
      clientY: t.clientY,
      identifier: t.identifier
    }));
  el.addEventListener('touchstart', (e) => {
    e.preventDefault();
    cb('start', norm(e.touches));
  });
  el.addEventListener('touchmove', (e) => {
    e.preventDefault();
    cb('move', norm(e.touches));
  });
  el.addEventListener('touchend', (e) => {
    e.preventDefault();
    cb('end', norm(e.changedTouches));
  });
  el.addEventListener('mousedown', (e) =>
    cb('start', [{ clientX: e.clientX, clientY: e.clientY, identifier: 0 }])
  );
  el.addEventListener('mouseup', (e) =>
    cb('end', [{ clientX: e.clientX, clientY: e.clientY, identifier: 0 }])
  );
}

function getStorage(key, def) {
  try {
    if (IS_WX) {
      const v = wx.getStorageSync(key);
      return v === '' || v === undefined ? def : v;
    }
    const raw = window.localStorage.getItem(key);
    return raw === null ? def : JSON.parse(raw);
  } catch (e) {
    return def;
  }
}

function setStorage(key, val) {
  try {
    if (IS_WX) wx.setStorageSync(key, val);
    else window.localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    /* 存档失败不阻塞游戏 */
  }
}

// 分包加载：失败降级（契约 §五）
function loadSubpackage(name, ok, fail) {
  if (!IS_WX || !wx.loadSubpackage) return ok && ok();
  const task = wx.loadSubpackage({
    name,
    success: () => ok && ok(),
    fail: () => fail && fail()
  });
  return task;
}

module.exports = {
  IS_WX,
  mainCanvas,
  viewport,
  createImage,
  raf,
  now,
  onResize,
  onTouch,
  getStorage,
  setStorage,
  loadSubpackage
};

};
__defs["src/text.js"]=function(module,exports,__req){
// 系统字体渲染：不打包任何字体文件（契约 §一）
// 三端中文字宽差异 5~10%，所以一律 measureText 动态排版，禁止写死宽度
const C = __req("src/config.js");

const NO_LINE_START = '，。、；：？！）》」』】,.;:?!)]}~%';

function font(size, bold) {
  return (bold ? 'bold ' : '') + size + 'px ' + C.FONT;
}

function measure(ctx, str, size, bold) {
  ctx.font = font(size, bold);
  return ctx.measureText(str).width;
}

// 逐字折行（中文），标点不出现在行首
function wrap(ctx, text, maxWidth, size, bold) {
  ctx.font = font(size, bold);
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (ch === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    const test = line + ch;
    if (line && ctx.measureText(test).width > maxWidth) {
      if (NO_LINE_START.indexOf(ch) >= 0) {
        lines.push(test); // 标点挂在上一行行尾
        line = '';
        continue;
      }
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// 画多行文本；返回占用高度
function drawLines(ctx, lines, x, y, opt) {
  const size = opt.size || 26;
  const lh = size * (opt.lineHeight || 1.5);
  ctx.font = font(size, opt.bold);
  ctx.textAlign = opt.align || 'left';
  ctx.textBaseline = 'top';
  if (opt.shadow) {
    ctx.shadowColor = opt.shadow;
    ctx.shadowBlur = opt.shadowBlur || 6;
    ctx.shadowOffsetY = opt.shadowOffsetY || 2;
  }
  lines.forEach((ln, i) => {
    if (opt.stroke) {
      ctx.lineWidth = opt.strokeWidth || 3;
      ctx.strokeStyle = opt.stroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(ln, x, y + i * lh);
    }
    ctx.fillStyle = opt.color || '#F5EFE3';
    ctx.fillText(ln, x, y + i * lh);
  });
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  return lines.length * lh;
}

module.exports = { font, measure, wrap, drawLines };

};
__defs["src/assets.js"]=function(module,exports,__req){
// 资源加载器：只认 manifest 的 key，不猜文件名（契约 §三）
// 主包图直连，分包（闪回静帧）按需加载、失败降级
const P = __req("src/platform.js");
const manifest = __req("assets/assets-manifest.js");

function allAssets() {
  const list = ((manifest && manifest.assets) || []).slice();
  return list;
}

class Assets {
  constructor() {
    this.images = {};
    this.segments = {};
    this.total = 0;
    this.loaded = 0;
    this.failed = [];
  }

  load(onProgress, onDone) {
    const list = allAssets();
    this.total = list.length;
    if (!list.length) {
      if (onDone) onDone(0, 0);
      return;
    }
    list.forEach((item) => {
      const img = P.createImage();
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        this.loaded++;
        if (ok) this.images[item.key] = img;
        else this.failed.push(item.key);
        if (onProgress) onProgress(this.loaded, this.total);
        if (this.loaded === this.total && onDone) onDone(this.loaded, this.failed.length);
      };
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = item.path;
    });
  }

  img(key) {
    return this.images[key] || null;
  }

  // 图集切帧（契约 §3.2 frames）
  frames(key) {
    for (let i = 0; i < allAssets().length; i++) {
      if (allAssets()[i].key === key) return allAssets()[i].frames || null;
    }
    return null;
  }

  // 按帧名取单格坐标
  frameOf(atlasKey, frameKey) {
    const list = this.frames(atlasKey) || [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].key === frameKey) return list[i];
    }
    return null;
  }

  // 分包：段定义 + 按需加载
  segment(key) {
    const list = (manifest && manifest.subpackages) || [];
    for (let i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }

  segmentPaths(key) {
    const seg = this.segment(key);
    return seg ? seg.assets.map((a) => a.path) : [];
  }

  // 分包包名 = dir 最后一段（game.json 里声明的 root 目录名），name 只是展示名
  pkgName(seg) {
    if (seg.pkg) return seg.pkg;
    const parts = (seg.dir || '').split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : seg.key;
  }

  // 加载某段闪回：分包成功且图全到位才算成功，否则 onDone(null) 降级
  loadSegment(key, onDone) {
    if (this.segments[key]) return onDone && onDone(this.segments[key]);
    const seg = this.segment(key);
    if (!seg) return onDone && onDone(null);
    const paths = seg.assets.map((a) => a.path);
    const start = () => {
      const imgs = [];
      let n = 0;
      let dead = false;
      paths.forEach((p) => {
        const im = P.createImage();
        im.onload = () => {
          if (dead) return;
          imgs.push(im);
          if (++n === paths.length) {
            this.segments[key] = imgs;
            onDone && onDone(imgs);
          }
        };
        im.onerror = () => {
          if (dead) return;
          dead = true;
          onDone && onDone(null);
        };
        im.src = p;
      });
    };
    P.loadSubpackage(this.pkgName(seg), start, () => onDone && onDone(null));
  }
}

module.exports = Assets;

};
__defs["src/ui.js"]=function(module,exports,__req){
// UI 绘制工具：全部走 Canvas 2D，无外部资源依赖
const C = __req("src/config.js");
const T = __req("src/text.js");

const PALETTE = {
  dusk: ['#241C3B', '#4A3768', '#B4763E'],
  night: ['#121A2A', '#1B2A41', '#6B4A2F'],
  ink: '#1B2A41',
  gold: '#F2B544',
  paper: '#F5EFE3',
  wood: '#6B4A2F',
  accentRed: '#C4452C'
};

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, opt) {
  opt = opt || {};
  ctx.save();
  rr(ctx, x, y, w, h, opt.radius == null ? 16 : opt.radius);
  if (opt.shadow) {
    ctx.shadowColor = opt.shadow;
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
  }
  ctx.fillStyle = opt.fill || 'rgba(12,16,26,0.88)';
  ctx.fill();
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (opt.border) {
    ctx.lineWidth = opt.borderWidth || 2;
    ctx.strokeStyle = opt.border;
    ctx.stroke();
  }
  ctx.restore();
}

function button(ctx, x, y, w, h, label, opt) {
  opt = opt || {};
  const radius = opt.radius == null ? h / 2 : opt.radius;
  panel(ctx, x, y, w, h, {
    fill: opt.bg || 'rgba(242,181,68,0.92)',
    border: opt.border,
    radius,
    shadow: opt.shadow
  });
  ctx.font = T.font(opt.size || 32, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = opt.color || '#1B2A41';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  return { x, y, w, h };
}

function badge(ctx, x, y, w, h, label, opt) {
  opt = opt || {};
  panel(ctx, x, y, w, h, {
    fill: opt.bg || 'rgba(12,16,26,0.72)',
    border: opt.border || 'rgba(242,181,68,0.4)',
    radius: h / 2
  });
  ctx.font = T.font(opt.size || 24, false);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = opt.color || PALETTE.paper;
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}

function hit(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

// 从图集里画一格（帧坐标来自 manifest.frames）
function drawFrame(ctx, img, f, x, y, w, h) {
  if (!img || !img.width || !f) return;
  ctx.drawImage(img, f.x, f.y, f.w, f.h, x, y, w, h);
}

function fallbackBg(ctx, W, H, colors) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.55, colors[1]);
  g.addColorStop(1, colors[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// 背景：cover 绘制（等比铺满居中裁切），上下 146 外扩带加暗角盖住接缝
function drawBgCover(ctx, app, key, colors) {
  const W = app.W;
  const H = app.H;
  const img = app.assets.img(key);
  if (img && img.width) {
    const s = Math.max(W / img.width, H / img.height);
    const dw = img.width * s;
    const dh = img.height * s;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    fallbackBg(ctx, W, H, colors || PALETTE.dusk);
  }
  // 接缝兜底：上下各 170px 轻微暗角，既压接缝也符合夜景
  let g = ctx.createLinearGradient(0, 0, 0, 170);
  g.addColorStop(0, 'rgba(6,8,14,0.42)');
  g.addColorStop(1, 'rgba(6,8,14,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 170);
  g = ctx.createLinearGradient(0, H - 170, 0, H);
  g.addColorStop(0, 'rgba(6,8,14,0)');
  g.addColorStop(1, 'rgba(6,8,14,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, H - 170, W, 170);
}

module.exports = {
  PALETTE,
  rr,
  panel,
  button,
  badge,
  hit,
  drawFrame,
  drawBgCover
};

};
__defs["src/expr.js"]=function(module,exports,__req){
// 表情零件：程序绘制（替代 AI 小图集）
// 理由：AI 出的眼/嘴/腮红零件跨角色对不齐，Q 版表情本来就是符号级的，Canvas 画更稳
// 接口与素材图集二选一：素材侧不出表情图集，这里提供 drawFeatures 供立绘叠层
const INK = '#3B2A20';
const SKIN = '#F6DCC0';
const BLUSH = 'rgba(196,69,44,0.20)';

function eye(ctx, x, y, r, kind) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  if (kind === 'happy') {
    ctx.lineWidth = Math.max(2, r * 0.4);
    ctx.beginPath();
    ctx.arc(x, y + r * 0.3, r, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (kind === 'blink') {
    ctx.lineWidth = Math.max(2, r * 0.38);
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - r * 0.24, y - r * 0.26, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function mouth(ctx, x, y, r, kind) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  if (kind === 'smile') {
    ctx.lineWidth = Math.max(2, r * 0.34);
    ctx.beginPath();
    ctx.arc(x, y - r * 0.25, r, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  } else if (kind === 'sad') {
    ctx.lineWidth = Math.max(2, r * 0.34);
    ctx.beginPath();
    ctx.arc(x, y + r * 0.35, r, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  } else if (kind === 'open') {
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.34, r * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.lineWidth = Math.max(2, r * 0.3);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.42, y);
    ctx.lineTo(x + r * 0.42, y);
    ctx.stroke();
  }
  ctx.restore();
}

function blushMark(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = BLUSH;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.62, r * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 在半径 r 的头部上画五官；offsetY 让五官整体落在脸上
function drawFeatures(ctx, x, y, r, expr) {
  expr = expr || {};
  const eyeKind = expr.eye || 'normal';
  const mouthKind = expr.mouth || 'neutral';
  eye(ctx, x - r * 0.34, y - r * 0.12, r * 0.16, eyeKind);
  eye(ctx, x + r * 0.34, y - r * 0.12, r * 0.16, eyeKind);
  mouth(ctx, x, y + r * 0.34, r * 0.24, mouthKind);
  if (expr.blush) {
    blushMark(ctx, x - r * 0.56, y + r * 0.22, r * 0.3);
    blushMark(ctx, x + r * 0.56, y + r * 0.22, r * 0.3);
  }
}

// 立绘未到位时的占位小人（头部 + 肩线），生产环境只调 drawFeatures 叠在立绘上
function drawPlaceholderHead(ctx, x, y, r, expr) {
  ctx.save();
  ctx.fillStyle = '#2E2438';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 1.5, r * 1.25, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawFeatures(ctx, x, y, r, expr);
}

module.exports = { eye, mouth, blushMark, drawFeatures, drawPlaceholderHead };

};
__defs["src/story.js"]=function(module,exports,__req){
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

};
__defs["src/data/goods.js"]=function(module,exports,__req){
// 食材表：基础 6 味 + 高阶 14 味（高阶图集 16 格中 item2_shrimp / item2_cured_meat 按红线弃用）
// 合成链 3 条：葱×2→葱油、汤×2→高汤、蛋×2→蛋丝；其余高阶料只在云市买（稀有货）
const GOODS = [
  { id: 'noodle', name: '生面', atlas: 'ui_items_atlas', frame: 'item_noodle_raw', price: 6 },
  { id: 'soup', name: '汤底', atlas: 'ui_items_atlas', frame: 'item_bowl', price: 5 },
  { id: 'scallion', name: '葱', atlas: 'ui_items_atlas', frame: 'item_scallion', price: 3 },
  { id: 'egg', name: '蛋', atlas: 'ui_items_atlas', frame: 'item_egg', price: 5 },
  { id: 'greens', name: '青菜', atlas: 'ui_items_atlas', frame: 'item_greens', price: 4 },
  { id: 'fire', name: '柴火', atlas: 'ui_items_atlas', frame: 'item_fire', price: 4 },

  { id: 'scallion_oil', name: '葱油', atlas: 'ui_items2_atlas', frame: 'item2_scallion_oil', price: 14, tier: 2 },
  { id: 'bone_broth', name: '高汤', atlas: 'ui_items2_atlas', frame: 'item2_bone_broth', price: 16, tier: 2 },
  { id: 'egg_shred', name: '蛋丝', atlas: 'ui_items2_atlas', frame: 'item2_egg_shred', price: 12, tier: 2 },
  { id: 'seaweed', name: '海苔丝', atlas: 'ui_items2_atlas', frame: 'item2_seaweed', price: 10, tier: 2 },
  { id: 'snow_mushroom', name: '白玉菇', atlas: 'ui_items2_atlas', frame: 'item2_snow_mushroom', price: 18, tier: 2 },
  { id: 'cloud_tea', name: '云雾茶', atlas: 'ui_items2_atlas', frame: 'item2_cloud_tea', price: 24, tier: 2, rare: true },
  { id: 'gold_pill', name: '金丸', atlas: 'ui_items2_atlas', frame: 'item2_gold_pill', price: 20, tier: 2 },
  { id: 'chili_powder', name: '辣粉', atlas: 'ui_items2_atlas', frame: 'item2_chili_powder', price: 9, tier: 2 },
  { id: 'bean_paste', name: '面酱', atlas: 'ui_items2_atlas', frame: 'item2_bean_paste', price: 11, tier: 2 },
  { id: 'sesame', name: '白芝麻', atlas: 'ui_items2_atlas', frame: 'item2_sesame', price: 8, tier: 2 },
  { id: 'osmanthus_honey', name: '桂花蜜', atlas: 'ui_items2_atlas', frame: 'item2_osmanthus_honey', price: 22, tier: 2 },
  { id: 'amber_sugar', name: '琥珀糖', atlas: 'ui_items2_atlas', frame: 'item2_amber_sugar', price: 19, tier: 2, rare: true },
  { id: 'green_pepper', name: '青花椒', atlas: 'ui_items2_atlas', frame: 'item2_green_pepper', price: 15, tier: 2 },
  { id: 'lotus_leaf', name: '干荷叶', atlas: 'ui_items2_atlas', frame: 'item2_lotus_leaf', price: 13, tier: 2 }
];

// 合成：两个同类基础料 → 一味高阶料
const RECIPES = [
  { input: 'scallion', out: 'scallion_oil' },
  { input: 'soup', out: 'bone_broth' },
  { input: 'egg', out: 'egg_shred' }
];

const BASE_IDS = ['noodle', 'soup', 'scallion', 'egg', 'greens', 'fire'];

function byId(id) {
  for (let i = 0; i < GOODS.length; i++) if (GOODS[i].id === id) return GOODS[i];
  return null;
}
function recipeFor(input) {
  for (let i = 0; i < RECIPES.length; i++) if (RECIPES[i].input === input) return RECIPES[i];
  return null;
}

module.exports = { GOODS: GOODS, RECIPES: RECIPES, BASE_IDS: BASE_IDS, byId: byId, recipeFor: recipeFor };

};
__defs["src/data/cards.js"]=function(module,exports,__req){
// 改良牌（Roguelike 三选一）：每夜开场抽 3 张取 1，效果只作用于本夜
module.exports = [
  { id: 'old_soup', name: '老汤', desc: '每碗底分 +3' },
  { id: 'dual_pot', name: '双锅', desc: '火候带 +6（更好控）' },
  { id: 'charred', name: '焦香', desc: '糊一碗不倒扣，下一碗倍率 +2' },
  { id: 'reheat', name: '回火', desc: '完美出餐倍率 +0.5' },
  { id: 'trader', name: '市侩', desc: '本夜卖出价 +20%' },
  { id: 'timer', name: '定时', desc: '客人时限 +20%' },
  { id: 'quick_knife', name: '快刀', desc: '切配只需 2 个同类' },
  { id: 'slow_fire', name: '顺火', desc: '火升得更慢（更好压）' },
  { id: 'incense', name: '香火', desc: '夜末香火 +30%' },
  { id: 'good_stock', name: '好料', desc: '完美出餐额外 +1 文' },
  { id: 'clear_soup', name: '清汤', desc: '欠火也按八成结算' },
  { id: 'notes', name: '手记', desc: '仓库 +4' }
];

};
__defs["src/systems/tune.js"]=function(module,exports,__req){
// 调试调参：只在浏览器调试页用 ?tune=fire:1.2,prep:0.8,price:1.5,burn:96
// 正式包（wx 环境没有 window）自动回落默认值，等同于忽略
const DEFAULTS = { fire: 1, prep: 1, price: 1, burn: 92 };

function parse(str) {
  const o = Object.assign({}, DEFAULTS);
  if (!str) return o;
  str.split(',').forEach(function (p) {
    const i = p.indexOf(':');
    if (i <= 0) return;
    const k = p.slice(0, i).trim();
    const v = parseFloat(p.slice(i + 1));
    if (Object.prototype.hasOwnProperty.call(o, k) && isFinite(v)) o[k] = v;
  });
  return o;
}

function fromUrl() {
  try {
    if (typeof window === 'undefined' || !window.location) return Object.assign({}, DEFAULTS);
    const m = /(?:^|[?&])tune=([^&]*)/.exec(window.location.search || '');
    return m ? parse(decodeURIComponent(m[1])) : Object.assign({}, DEFAULTS);
  } catch (e) {
    return Object.assign({}, DEFAULTS);
  }
}

const T = fromUrl();
T.active = ['fire', 'prep', 'price', 'burn'].some(function (k) {
  return T[k] !== DEFAULTS[k];
});

module.exports = { T: T, DEFAULTS: DEFAULTS, parse: parse, fromUrl: fromUrl };

};
__defs["src/systems/game.js"]=function(module,exports,__req){
// 经济 + 夜局状态（单一份状态机；场景只读状态、调这里的方法）
const P = __req("src/platform.js");
const D = __req("src/data/goods.js");
const CARDS = __req("src/data/cards.js");
const TUNE = __req("src/systems/tune.js").T;

const SAVE_KEY = 'noodle_save_v1';

// 稳定随机：同一天全服同价（日期种子）
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rnd01(seed) {
  const x = Math.sin(seed * 0.0001) * 10000;
  return x - Math.floor(x);
}

const S = {
  day: 1,
  coins: 60,
  incense: 0,
  debt: 300,
  debtMin: 30,
  capacity: 30,
  stock: { noodle: 12, soup: 9, scallion: 9, egg: 6, greens: 6, fire: 6 },
  boxDay: 0,
  lastTs: 0,
  notePages: 0,
  best: 0
};

function save() {
  S.lastTs = P.now();
  P.setStorage(SAVE_KEY, S);
}

function load() {
  const v = P.getStorage(SAVE_KEY, null);
  if (v && typeof v === 'object') Object.assign(S, v);
  // 离线香火：按离店时间产，上限 8 小时
  const now = P.now();
  if (S.lastTs && now > S.lastTs) {
    const mins = Math.min(480, Math.floor((now - S.lastTs) / 60000));
    const add = Math.floor(mins / 10);
    if (add > 0) S.incense += add;
  }
  S.day = S.day || 1;
  save();
  return S;
}

function reset() {
  S.day = 1;
  S.coins = 60;
  S.incense = 0;
  S.debt = 300;
  S.capacity = 30;
  S.stock = { noodle: 12, soup: 9, scallion: 9, egg: 6, greens: 6, fire: 6 };
  S.boxDay = 0;
  S.notePages = 0;
  save();
}

// 当日价：基准 × 0.6~1.4；稀有货只有部分日子到货
function priceOf(id) {
  const g = D.byId(id);
  if (!g) return null;
  if (g.rare && rnd01(hashStr('rare' + S.day + id)) < 0.5) return null;
  // 浮动幅度可调：tune.price 放大/缩小 ±40% 的幅度
  const f = 1 + (0.6 + 0.8 * rnd01(hashStr('p' + S.day + id)) - 1) * TUNE.price;
  return Math.round(g.price * f);
}

function stockCount(id) {
  return S.stock[id] || 0;
}
function stockTotal() {
  let n = 0;
  Object.keys(S.stock).forEach(function (k) { n += S.stock[k]; });
  return n;
}

function canBuyRare() {
  // 赊账压力：还不上今日最低还款时，只是买不了稀有货，不封进度
  return S.debt <= 0 || S.coins >= S.debtMin;
}

function buy(id, qty) {
  qty = qty || 1;
  const p = priceOf(id);
  if (p === null) return { ok: false, msg: '今日不到货' };
  const g = D.byId(id);
  if (g.rare && !canBuyRare()) return { ok: false, msg: '欠款未还，稀有货不赊' };
  const cost = p * qty;
  if (S.coins < cost) return { ok: false, msg: '文钱不够' };
  if (stockTotal() + qty > S.capacity) return { ok: false, msg: '仓库已满' };
  S.coins -= cost;
  S.stock[id] = stockCount(id) + qty;
  save();
  return { ok: true, msg: '买进 ' + qty + ' 份，花 ' + cost + ' 文' };
}

function sell(id, qty) {
  qty = qty || 1;
  if (stockCount(id) < qty) return { ok: false, msg: '库存不足' };
  const p = priceOf(id);
  const unit = Math.max(1, Math.round((p === null ? D.byId(id).price : p) * 0.6));
  S.stock[id] = stockCount(id) - qty;
  S.coins += unit * qty;
  save();
  return { ok: true, msg: '卖回 ' + qty + ' 份，得 ' + unit * qty + ' 文' };
}

// 每日一次免费进货箱：随机 3–5 份基础料
function openBox() {
  if (S.boxDay === S.day) return { ok: false, msg: '今日已开过' };
  const n = 3 + Math.floor(rnd01(hashStr('box' + S.day)) * 3);
  const got = {};
  for (let i = 0; i < n; i++) {
    const id = D.BASE_IDS[Math.floor(rnd01(hashStr('b' + S.day + i)) * D.BASE_IDS.length)];
    if (stockTotal() >= S.capacity) break;
    S.stock[id] = stockCount(id) + 1;
    got[id] = (got[id] || 0) + 1;
  }
  S.boxDay = S.day;
  save();
  const names = Object.keys(got).map(function (k) { return D.byId(k).name + '×' + got[k]; }).join(' ');
  return { ok: true, msg: '箱里是：' + (names || '空的') };
}

function repay() {
  const pay = Math.min(S.debtMin, S.coins, S.debt);
  if (pay <= 0) return { ok: false, msg: '今日无需还款或文钱不够' };
  S.coins -= pay;
  S.debt = Math.max(0, S.debt - pay);
  save();
  return { ok: true, msg: '还了 ' + pay + ' 文' };
}

// ---------- 夜局 ----------
const N = {
  active: false,
  day: 1,
  guests: 5,
  idx: 0,
  coins: 0,
  incense: 0,
  phase: 'pick', // pick | cook | result | summary
  card: null,
  offers: [],
  order: null,
  prep: [],
  cutBuf: {},
  heat: 20,
  hold: false,
  burnT: 0,
  burnt: false,
  msg: '',
  msgT: 0,
  total: 0
};

const GUEST_KEYS = [
  'ch_guest_peddler', 'ch_guest_courier', 'ch_guest_granny', 'ch_guest_swordsman',
  'ch_guest_kid', 'ch_guest_clerk', 'ch_guest_stranger', 'ch_guest_xian_01',
  'ch_guest_cloudnoble', 'ch_guest_merchant'
];
const GUEST_NAMES = [
  '挑担货郎', '跑信少年', '卖伞的婆婆', '赶路的剑客', '送灯的孩子',
  '记性的账房', '无名黑衣人', '云海老客', '云顶贵客', '云舟行女商'
];

function orderFor(idx) {
  const k = (idx + hashStr('o' + S.day)) % GUEST_KEYS.length;
  const need = [{ id: 'noodle' }];
  // 配料：优先库存里有的高阶料，否则一款基础料
  const adv = D.GOODS.filter(function (g) { return g.tier === 2 && stockCount(g.id) > 0; });
  if (adv.length && rnd01(hashStr('adv' + S.day + idx)) > 0.35) {
    need.push({ id: adv[Math.floor(rnd01(hashStr('a' + S.day + idx)) * adv.length)].id });
  } else {
    const pool = ['scallion', 'egg', 'greens'];
    need.push({ id: pool[Math.floor(rnd01(hashStr('b' + S.day + idx)) * pool.length)] });
  }
  return {
    guestKey: GUEST_KEYS[k],
    guestName: GUEST_NAMES[k],
    need: need,
    band: [56, 74],
    limit: 22,
    t: 0
  };
}

function startNight() {
  const st = load();
  N.active = true;
  N.day = st.day;
  N.idx = 0;
  N.coins = 0;
  N.incense = 0;
  N.phase = 'pick';
  N.card = null;
  N.prep = [];
  N.cutBuf = {};
  N.heat = 20;
  N.hold = false;
  N.burnT = 0;
  N.burnt = false;
  N.msg = '';
  N.msgT = 0;
  N.total = 0;
  // 抽 3 张改良牌
  const pool = CARDS.slice();
  N.offers = [];
  for (let i = 0; i < 3; i++) {
    const j = Math.floor(rnd01(hashStr('card' + st.day + i)) * pool.length);
    N.offers.push(pool.splice(j, 1)[0]);
  }
  return N;
}

function chooseCard(id) {
  for (let i = 0; i < N.offers.length; i++) {
    if (N.offers[i].id === id) {
      N.card = N.offers[i];
      break;
    }
  }
  N.phase = 'cook';
  N.order = orderFor(N.idx);
  if (N.card && N.card.id === 'dual_pot') {
    N.order.band = [N.order.band[0] - 3, N.order.band[1] + 3];
  }
  if (N.card && N.card.id === 'timer') N.order.limit = Math.round(N.order.limit * 1.2);
  N.prep = [];
  N.cutBuf = {};
  N.heat = 20;
  N.burnt = false;
  save();
  return N;
}

function cutNeed() {
  // 备料压力可调：tune.prep 缩放所需同类数量（最少 2 个）
  const base = Math.max(2, Math.round(3 * TUNE.prep));
  return N.card && N.card.id === 'quick_knife' ? Math.max(2, base - 1) : base;
}

// 切配：点同一个食材 cutNeed() 次凑成一份备料
function cut(id) {
  if (N.phase !== 'cook') return { ok: false, msg: '' };
  N.cutBuf[id] = (N.cutBuf[id] || 0) + 1;
  const need = cutNeed();
  if (N.cutBuf[id] >= need) {
    if (stockCount(id) >= need) {
      S.stock[id] = stockCount(id) - need;
      N.cutBuf[id] = 0;
      N.prep.push(id);
      save();
      return { ok: true, msg: '备好一份' };
    }
    N.cutBuf[id] = 0;
    return { ok: false, msg: '库存不够' };
  }
  return { ok: true, msg: '' };
}

function prepDone() {
  if (!N.order) return false;
  return N.order.need.every(function (n) {
    return N.prep.indexOf(n.id) >= 0;
  });
}

function serve() {
  if (N.phase !== 'cook') return { ok: false, msg: '' };
  if (!prepDone()) return { ok: false, msg: '备料还没齐' };
  const band = N.order.band;
  const mid = (band[0] + band[1]) / 2;
  const half = Math.max(6, (band[1] - band[0]) / 2);
  const inBand = N.heat >= band[0] && N.heat <= band[1];
  let mult;
  let text;
  if (N.burnt) {
    if (N.card && N.card.id === 'charred') {
      mult = 0;
      text = '糊了，客人说不碍事（焦香：下一碗 +2 倍）';
    } else {
      mult = 0;
      text = '糊了，这碗自己吃，客人不怪';
    }
  } else if (inBand) {
    mult = 1.6 + (N.card && N.card.id === 'reheat' ? 0.5 : 0);
    text = '火候正好';
  } else if (N.heat < band[0]) {
    mult = N.card && N.card.id === 'clear_soup' ? 1.28 : 0.9;
    text = '欠一点火';
  } else {
    mult = 0.7;
    text = '过火了一点';
  }
  const base = 12 + (N.card && N.card.id === 'old_soup' ? 3 : 0);
  let gain = Math.round(base * mult);
  if (inBand && N.card && N.card.id === 'good_stock') gain += 1;
  N.coins += gain;
  N.incense += 1;
  N.total++;
  N.msg = text + '，得 ' + gain + ' 文';
  N.msgT = 1.6;
  N.phase = 'result';
  save();
  return { ok: true, msg: N.msg };
}

function nextGuest() {
  N.idx++;
  if (N.idx >= N.guests) {
    N.phase = 'summary';
    S.coins += N.coins;
    const bonus = N.card && N.card.id === 'incense' ? Math.round(N.incense * 1.3) : N.incense;
    S.incense += bonus;
    S.day++;
    if (N.coins > S.best) S.best = N.coins;
    S.notePages++;
    save();
    return { done: true };
  }
  N.phase = 'cook';
  N.order = orderFor(N.idx);
  if (N.card && N.card.id === 'dual_pot') N.order.band = [53, 77];
  if (N.card && N.card.id === 'timer') N.order.limit = Math.round(N.order.limit * 1.2);
  N.prep = [];
  N.cutBuf = {};
  N.heat = 20;
  N.burnt = false;
  N.burnT = 0;
  return { done: false };
}

// 火候：按住加火、松开压火；超过 92 持续 0.8 秒就糊
function updateHeat(dt) {
  if (N.phase !== 'cook') return;
  // 火候速度可调：tune.fire 同时放大加火与压火
  const up = (N.card && N.card.id === 'slow_fire' ? 56 : 70) * TUNE.fire;
  const down = 55 * TUNE.fire;
  N.heat += (N.hold ? up : -down) * dt;
  if (N.heat < 0) N.heat = 0;
  if (N.heat > 100) N.heat = 100;
  // 糊锅阈值可调：tune.burn
  if (N.heat > TUNE.burn) N.burnT += dt;
  else N.burnT = 0;
  if (N.burnT > 0.8) N.burnt = true;
  if (N.msgT > 0) N.msgT -= dt;
}

module.exports = {
  S: S, N: N,
  load: load, save: save, reset: reset,
  priceOf: priceOf, stockCount: stockCount, stockTotal: stockTotal,
  canBuyRare: canBuyRare, buy: buy, sell: sell, openBox: openBox, repay: repay,
  startNight: startNight, chooseCard: chooseCard, cut: cut, cutNeed: cutNeed,
  prepDone: prepDone, serve: serve, nextGuest: nextGuest, updateHeat: updateHeat,
  CARDS: CARDS, GUEST_KEYS: GUEST_KEYS
};

};
__defs["src/systems/board.js"]=function(module,exports,__req){
// 备料案板：5×5 三消引擎（棋盘生成、匹配、消除、掉落、连击）
// 数值口径来自《五机制咬合设计》2.4：3 连 = 上菜进度 +1；火候 每秒 +1.6、每次三消 −3、连击每 +1 额外 −0.4、满 100 糊锅
const KINDS = ['noodle', 'soup', 'scallion', 'egg', 'greens'];

const HEAT_PER_SEC = 1.6;
const HEAT_PER_MATCH = 3;
const HEAT_PER_COMBO = 0.4;
const HEAT_MAX = 100;
const PROGRESS_PER_MATCH = 1;
const TARGET_PER_GUEST = 5;

function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

class Board {
  constructor(seed) {
    this.cols = 5;
    this.rows = 5;
    this.rng = makeRng(seed || Date.now() % 100000);
    this.grid = [];
    this.combo = 0;
    this.progress = 0;
    this.heat = 0;
    this.over = false;
    this.lastGain = 0;
    this.reset();
  }

  reset() {
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
      const row = [];
      for (let x = 0; x < this.cols; x++) row.push(this.randKind());
      this.grid.push(row);
    }
    // 起始盘面不允许已有三连
    let guard = 0;
    while (this.findMatches().cells.length && guard++ < 200) {
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) this.grid[y][x] = this.randKind();
      }
    }
    this.combo = 0;
    this.progress = 0;
    this.heat = 0;
    this.over = false;
  }

  randKind() {
    return KINDS[Math.floor(this.rng() * KINDS.length)];
  }

  at(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
    return this.grid[y][x];
  }

  setGrid(rows) {
    this.grid = rows.map(function (r) { return r.slice(); });
  }

  // 找出所有 ≥3 的横竖连；返回 {cells:[[x,y]...], runs:[{len, dir}]}
  findMatches() {
    const mark = {};
    const runs = [];
    // 横
    for (let y = 0; y < this.rows; y++) {
      let start = 0;
      for (let x = 1; x <= this.cols; x++) {
        const same = x < this.cols && this.grid[y][x] === this.grid[y][start];
        if (!same) {
          const len = x - start;
          if (len >= 3) {
            runs.push({ len: len, dir: 'h' });
            for (let k = start; k < x; k++) mark[y * this.cols + k] = true;
          }
          start = x;
        }
      }
    }
    // 竖
    for (let x = 0; x < this.cols; x++) {
      let start = 0;
      for (let y = 1; y <= this.rows; y++) {
        const same = y < this.rows && this.grid[y][x] === this.grid[start][x];
        if (!same) {
          const len = y - start;
          if (len >= 3) {
            runs.push({ len: len, dir: 'v' });
            for (let k = start; k < y; k++) mark[k * this.cols + x] = true;
          }
          start = y;
        }
      }
    }
    const cols = this.cols;
    const cells = Object.keys(mark).map(function (k) {
      return [k % cols, Math.floor(k / cols)];
    });
    return { cells: cells, runs: runs };
  }

  // 消除 + 掉落 + 补新，返回消除格数
  collapse(cells) {
    cells.forEach((c) => {
      this.grid[c[1]][c[0]] = null;
    });
    for (let x = 0; x < this.cols; x++) {
      let write = this.rows - 1;
      for (let y = this.rows - 1; y >= 0; y--) {
        if (this.grid[y][x] !== null) {
          this.grid[write][x] = this.grid[y][x];
          if (write !== y) this.grid[y][x] = null;
          write--;
        }
      }
      for (let y = write; y >= 0; y--) this.grid[y][x] = this.randKind();
    }
    return cells.length;
  }

  // 连锁结算：一次操作触发的全部消除
  resolve() {
    let cleared = 0;
    let steps = 0;
    this.combo = 0;
    for (;;) {
      const m = this.findMatches();
      if (!m.cells.length) break;
      steps++;
      this.combo = steps;
      cleared += this.collapse(m.cells);
      this.progress += PROGRESS_PER_MATCH;
      const drop = HEAT_PER_MATCH + HEAT_PER_COMBO * (this.combo - 1);
      this.heat = Math.max(0, this.heat - drop);
    }
    this.lastGain = this.progress * 12;
    if (this.heat >= HEAT_MAX) this.over = true;
    return { cleared: cleared, combo: this.combo, progress: this.progress };
  }

  // 尝试交换；不成三连则换回
  trySwap(ax, ay, bx, by) {
    if (this.over) return { ok: false, msg: '糊锅了' };
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    if (dx + dy !== 1) return { ok: false, msg: '只能换相邻两格' };
    const a = this.at(ax, ay);
    const b = this.at(bx, by);
    this.grid[ay][ax] = b;
    this.grid[by][bx] = a;
    if (!this.findMatches().cells.length) {
      this.grid[ay][ax] = a;
      this.grid[by][bx] = b;
      return { ok: false, msg: '换不成一道工序' };
    }
    const r = this.resolve();
    return { ok: true, cleared: r.cleared, combo: r.combo, progress: r.progress };
  }

  // 全局压力：火候随时间涨，满 100 糊锅（本夜结束，不删档）
  updateHeat(dt) {
    if (this.over) return;
    this.heat = Math.min(HEAT_MAX, this.heat + HEAT_PER_SEC * dt);
    if (this.heat >= HEAT_MAX) this.over = true;
  }

  guestsServed() {
    return Math.floor(this.progress / TARGET_PER_GUEST);
  }
  progressToGuest() {
    return this.progress % TARGET_PER_GUEST;
  }
}

module.exports = {
  Board: Board,
  KINDS: KINDS,
  TARGET_PER_GUEST: TARGET_PER_GUEST,
  HEAT_MAX: HEAT_MAX,
  HEAT_PER_SEC: HEAT_PER_SEC
};

};
__defs["src/engine.js"]=function(module,exports,__req){
// 引擎：主循环、DPR/cover 适配、输入分发、场景管理
const C = __req("src/config.js");
const P = __req("src/platform.js");

class Engine {
  constructor() {
    this.W = C.DESIGN_W;
    this.H = C.DESIGN_H;
    this.s = 1;
    this.scale = 1;
    this.scenes = {};
    this.scene = null;
    this.sceneName = null;
    this.touchStart = null;
    this.frameCount = 0;
    this.fpsSamples = [];
  }

  register(name, scene) {
    this.scenes[name] = scene;
  }

  setScene(name, params) {
    const next = this.scenes[name];
    if (!next) throw new Error('scene not found: ' + name);
    if (this.scene && this.scene.exit) this.scene.exit(this);
    this.scene = next;
    this.sceneName = name;
    if (next.enter) next.enter(this, params || {});
  }

  resize() {
    const vp = P.viewport();
    const canvas = P.mainCanvas();
    this.vp = vp;
    this.canvas = canvas;
    canvas.width = Math.round(vp.width * vp.dpr);
    canvas.height = Math.round(vp.height * vp.dpr);
    if (!P.IS_WX) {
      canvas.style.width = vp.width + 'px';
      canvas.style.height = vp.height + 'px';
    }
    this.ctx = canvas.getContext('2d');
    this.s = vp.width / C.DESIGN_W; // 设计单位 -> CSS px
    this.scale = vp.dpr * this.s; // 设计单位 -> 物理 px
    this.H = vp.height / this.s; // 可视高度（1334 ~ 1626）
    // 底部安全线随实际屏幕走：750×1334 时正好 1254，长屏自动下移，不能写死
    this.bottomY = this.H - 80;
    if (this.scene && this.scene.onResize) this.scene.onResize(this);
  }

  toDesign(t) {
    return { x: t.clientX / this.s, y: t.clientY / this.s };
  }

  bindInput() {
    P.onTouch((phase, touches) => {
      if (!touches || !touches.length) return;
      const p = this.toDesign(touches[0]);
      if (phase === 'start') {
        this.touchStart = { x: p.x, y: p.y, t: P.now() };
        if (this.scene && this.scene.onTouchDown)
          this.scene.onTouchDown(p.x, p.y, this);
      } else if (phase === 'end' && this.touchStart) {
        const dur = P.now() - this.touchStart.t;
        const dist = Math.sqrt(
          Math.pow(p.x - this.touchStart.x, 2) +
            Math.pow(p.y - this.touchStart.y, 2)
        );
        if (this.scene && this.scene.onTouchUp) this.scene.onTouchUp(p.x, p.y, this);
        if (dur < 600 && dist < 30 && this.scene && this.scene.onTap)
          this.scene.onTap(p.x, p.y, this);
        this.touchStart = null;
      }
    });
  }

  start() {
    this.resize();
    P.onResize(() => this.resize());
    this.bindInput();
    this.last = P.now();
    const loop = () => {
      const t = P.now();
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.frame(dt);
      P.raf(loop);
    };
    P.raf(loop);
  }

  frame(dt) {
    if (!this.scene) return;
    this.frameCount++;
    if (this.scene.update) this.scene.update(dt, this);
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    this.scene.draw(ctx, this);
    // 调试叠层：?probe=1 时把实测布局数字画在画面上（截图即可取证）
    if (this.overlay) {
      ctx.save();
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const lines = String(this.overlay).split('\n');
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(8, this.H - 12 - lines.length * 24, 640, lines.length * 24 + 8);
      ctx.fillStyle = '#8CF3A6';
      lines.forEach((l, i) => ctx.fillText(l, 14, this.H - 8 - lines.length * 24 + i * 24));
      ctx.restore();
    }
  }
}

module.exports = Engine;

};
__defs["assets/assets-manifest.js"]=function(module,exports,__req){
// 由 tools/import-assets.js 从素材席 assets-manifest.json 生成，勿手改
module.exports = {
 "version": 1,
 "assets": [
  {
   "key": "bg_cloud_market",
   "path": "assets/bg/bg_cloud_market.jpg",
   "w": 750,
   "h": 1626,
   "bytes": 224860,
   "sha256": "41c54fb6f7e013678672c54d0b8070badf1bc4d08b3c4092293a6c6567ed8ff8",
   "alpha": false,
   "source": "seedream(+edge-extend)",
   "anchor": [
    0,
    0
   ],
   "frames": null
  },
  {
   "key": "bg_noodle_close",
   "path": "assets/bg/bg_noodle_close.jpg",
   "w": 750,
   "h": 1626,
   "bytes": 223117,
   "sha256": "fc13f754852d51f9ea81562a1d3d423cc3fd2c074b7875c6f32ae56ca8244012",
   "alpha": false,
   "source": "seedream(+edge-extend)",
   "anchor": [
    0,
    0
   ],
   "frames": null
  },
  {
   "key": "bg_noodle_dusk",
   "path": "assets/bg/bg_noodle_dusk.jpg",
   "w": 750,
   "h": 1626,
   "bytes": 176274,
   "sha256": "b297bc4adf0c11794eb17ee55c6cc866e2f67f9ea9d19a5fe5b2f29215690058",
   "alpha": false,
   "source": "seedream(+edge-extend)",
   "anchor": [
    0,
    0
   ],
   "frames": null
  },
  {
   "key": "bg_noodle_night",
   "path": "assets/bg/bg_noodle_night.jpg",
   "w": 750,
   "h": 1626,
   "bytes": 238034,
   "sha256": "2e6bbc68f2e8f3f1b0b1baff3a45ac6bde22af2e4f3583bde64e3adf3044c339",
   "alpha": false,
   "source": "seedream(+edge-extend)",
   "anchor": [
    0,
    0
   ],
   "frames": null
  },
  {
   "key": "bg_noodle_rain",
   "path": "assets/bg/bg_noodle_rain.jpg",
   "w": 750,
   "h": 1626,
   "bytes": 269840,
   "sha256": "c2264263cc733c741ba3e1b82a42825163475ba0e3deb59c62458e10031e21cf",
   "alpha": false,
   "source": "seedream(+edge-extend)",
   "anchor": [
    0,
    0
   ],
   "frames": null
  },
  {
   "key": "bg_tian_cloud",
   "path": "assets/bg/bg_tian_cloud.jpg",
   "w": 750,
   "h": 1626,
   "bytes": 185308,
   "sha256": "8ccecdebab555c67403178e068b309a3a643a81b187d6857c603fd9470cbd734",
   "alpha": false,
   "source": "seedream(+edge-extend)",
   "anchor": [
    0,
    0
   ],
   "frames": null
  },
  {
   "key": "bg_tian_dusk",
   "path": "assets/bg/bg_tian_dusk.jpg",
   "w": 750,
   "h": 1626,
   "bytes": 236746,
   "sha256": "b0795270d1c1ed1712e13ddb43832093bd7377c85c901cff30aa6132ed34edb0",
   "alpha": false,
   "source": "seedream(+edge-extend)",
   "anchor": [
    0,
    0
   ],
   "frames": null
  },
  {
   "key": "ch_grandpa_idle",
   "path": "assets/ch/ch_grandpa_idle.png",
   "w": 400,
   "h": 900,
   "bytes": 84755,
   "sha256": "cedf16e3dca8d28dee246dbc7b5eabacc6fc781ad3af0affffe30cecaf006e9f",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    1
   ],
   "frames": null
  },
  {
   "key": "ch_guest_clerk",
   "path": "assets/ch/ch_guest_clerk.png",
   "w": 300,
   "h": 600,
   "bytes": 62227,
   "sha256": "39cba9a639354118500e2eba1c86f7035b597d806132578e7b9f0100587410f4",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    1
   ],
   "frames": null
  },
  {
   "key": "ch_guest_cloudnoble",
   "path": "assets/ch/ch_guest_cloudnoble.png",
   "w": 300,
   "h": 600,
   "bytes": 82353,
   "sha256": "d2d7d37fbf9063cb4cad757992b26a045dc0c69f2b98d770cc907853a2bcb723",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    1
   ],
   "frames": null
  },
  {
   "key": "ch_guest_courier",
   "path": "assets/ch/ch_guest_courier.png",
   "w": 300,
   "h": 600,
   "bytes": 55112,
   "sha256": "6baa7aeb0b5d36a786588b3b4504e77dac558972b9e91e36a95f385adccf9ef7",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    1
   ],
   "frames": null
  },
  {
   "key": "ch_guest_granny",
   "path": "assets/ch/ch_guest_granny.png",
   "w": 300,
   "h": 600,
   "bytes": 40782,
   "sha256": "f0ba8f7627d129ad8da64fce1e0712d6533bd6ea34a6f0ff593c763c0352803a",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    1
   ],
   "frames": null
  },
  {
   "key": "ch_guest_kid",
   "path": "assets/ch/ch_guest_kid.png",
   "w": 300,
   "h": 600,
   "bytes": 75163,
   "sha256": "a5c7bcdf0db270a8a6008c246fd1fcdaa78f1b68d4af3311a55697b37501e73e",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    1
   ],
   "frames": null
  },
  {
   "key": "ch_guest_merchant",
   "path": "assets/ch/ch_guest_merchant.png",
   "w": 300,
   "h": 600,
   "bytes": 81863,
   "sha256": "3d9dab414f978e847bb7d8020e114717d155a59902905f5d35b991ec632a79f5",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    1
   ],
   "frames": null
  },
  {
   "key": "ch_guest_peddler",
   "path": "assets/ch/ch_guest_peddler.png",
   "w": 300,
   "h": 600,
   "bytes": 38081,
   "sha256": "f5c7c3a268b96611824e4d2a61388b00b27112b5c8c7df3e480730022f8c25dd",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    1
   ],
   "frames": null
  },
  {
   "key": "ch_guest_stranger",
   "path": "assets/ch/ch_guest_stranger.png",
   "w": 300,
   "h": 600,
   "bytes": 88882,
   "sha256": "97d3705fd760582f841af67d885b10a22ca5750f0abc4aab7d784c127c44cee6",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    1
   ],
   "frames": null
  },
  {
   "key": "ch_guest_swordsman",
   "path": "assets/ch/ch_guest_swordsman.png",
   "w": 300,
   "h": 600,
   "bytes": 81385,
   "sha256": "df0c1a6b10a428c5b20c8b63a0ef18b1da866f9f12dfef5092733717690fb231",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    1
   ],
   "frames": null
  },
  {
   "key": "ch_guest_xian_01",
   "path": "assets/ch/ch_guest_xian_01.png",
   "w": 300,
   "h": 600,
   "bytes": 77688,
   "sha256": "7f6f859d862723806f965f711d540317782abc40d4fe320631bbe49d586b60b8",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    1
   ],
   "frames": null
  },
  {
   "key": "ch_owner_idle",
   "path": "assets/ch/ch_owner_idle.png",
   "w": 400,
   "h": 900,
   "bytes": 150121,
   "sha256": "3458c30bb03bf32d3f69ea9983cf8bf739b71e2fdc7e821d8d28eafc742d8ba6",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    1
   ],
   "frames": null
  },
  {
   "key": "shadow_soft",
   "path": "assets/fx/shadow_soft.png",
   "w": 256,
   "h": 96,
   "bytes": 1357,
   "sha256": "520103788a585483e3e18eeeff831ee70f041d6dc6074dc9d55a3b618c161ff6",
   "alpha": true,
   "source": "seedream+cutout+palette",
   "anchor": [
    0.5,
    0.5
   ],
   "frames": null
  },
  {
   "key": "journal_page",
   "path": "assets/ui/journal_page.jpg",
   "w": 640,
   "h": 480,
   "bytes": 46042,
   "sha256": "593ebc3f1e50aaaccaf4bcfc304cf98391191ee566639333b077e8316f3891e4",
   "alpha": false,
   "source": "seedream+cover",
   "anchor": [
    0,
    0
   ],
   "frames": null
  },
  {
   "key": "ui_cards_atlas",
   "path": "assets/ui/ui_cards_atlas.png",
   "w": 832,
   "h": 832,
   "bytes": 174089,
   "sha256": "983667d47b9bc50d8f49525dd8017457769138629b2ee6f46163ec2dbe09a252",
   "alpha": true,
   "source": "seedream+cutout+pack",
   "anchor": [
    0,
    0
   ],
   "frames": [
    {
     "key": "card_old_soup",
     "x": 30,
     "y": 30,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_double_pot",
     "x": 224,
     "y": 30,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_egg_shell",
     "x": 418,
     "y": 30,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_charred",
     "x": 612,
     "y": 30,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_echo",
     "x": 30,
     "y": 224,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_abacus",
     "x": 224,
     "y": 224,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_hourglass",
     "x": 418,
     "y": 224,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_cleaver",
     "x": 612,
     "y": 224,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_flame",
     "x": 30,
     "y": 418,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_plain_bowl",
     "x": 224,
     "y": 418,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_cupped_hands",
     "x": 418,
     "y": 418,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_journal",
     "x": 612,
     "y": 418,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_lantern",
     "x": 30,
     "y": 612,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_key",
     "x": 224,
     "y": 612,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_blank_tile",
     "x": 418,
     "y": 612,
     "w": 190,
     "h": 190
    },
    {
     "key": "card_cloud",
     "x": 612,
     "y": 612,
     "w": 190,
     "h": 190
    }
   ]
  },
  {
   "key": "ui_items2_atlas",
   "path": "assets/ui/ui_items2_atlas.png",
   "w": 832,
   "h": 832,
   "bytes": 176440,
   "sha256": "7217f8a5be23d460600e4038f290904e98f39f1b6762d92a18c98be47a1743e7",
   "alpha": true,
   "source": "seedream+cutout+pack",
   "anchor": [
    0,
    0
   ],
   "frames": [
    {
     "key": "item2_scallion_oil",
     "x": 30,
     "y": 30,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_bone_broth",
     "x": 224,
     "y": 30,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_egg_shred",
     "x": 418,
     "y": 30,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_seaweed",
     "x": 612,
     "y": 30,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_snow_mushroom",
     "x": 30,
     "y": 224,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_cloud_tea",
     "x": 224,
     "y": 224,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_gold_pill",
     "x": 418,
     "y": 224,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_chili_powder",
     "x": 612,
     "y": 224,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_bean_paste",
     "x": 30,
     "y": 418,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_shrimp",
     "x": 224,
     "y": 418,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_cured_meat",
     "x": 418,
     "y": 418,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_sesame",
     "x": 612,
     "y": 418,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_osmanthus_honey",
     "x": 30,
     "y": 612,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_amber_sugar",
     "x": 224,
     "y": 612,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_green_pepper",
     "x": 418,
     "y": 612,
     "w": 190,
     "h": 190
    },
    {
     "key": "item2_lotus_leaf",
     "x": 612,
     "y": 612,
     "w": 190,
     "h": 190
    }
   ]
  },
  {
   "key": "ui_items_atlas",
   "path": "assets/ui/ui_items_atlas.png",
   "w": 1024,
   "h": 640,
   "bytes": 133663,
   "sha256": "2f83663572069fecd8adeb0e724b87c3257304a8cd182b70ebdb7ce8370217c7",
   "alpha": true,
   "source": "seedream+cutout+pack",
   "anchor": [
    0,
    0
   ],
   "frames": [
    {
     "key": "item_noodle",
     "x": 29,
     "y": 31,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_ladle",
     "x": 223,
     "y": 31,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_noodle_raw",
     "x": 417,
     "y": 31,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_scallion",
     "x": 611,
     "y": 31,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_egg",
     "x": 805,
     "y": 31,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_greens",
     "x": 29,
     "y": 225,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_chopsticks",
     "x": 223,
     "y": 225,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_bowl",
     "x": 417,
     "y": 225,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_fire",
     "x": 611,
     "y": 225,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_pot",
     "x": 805,
     "y": 225,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_lantern",
     "x": 29,
     "y": 419,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_moneybag",
     "x": 223,
     "y": 419,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_cloth",
     "x": 417,
     "y": 419,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_jar",
     "x": 611,
     "y": 419,
     "w": 190,
     "h": 190
    },
    {
     "key": "item_tray",
     "x": 805,
     "y": 419,
     "w": 190,
     "h": 190
    }
   ]
  },
  {
   "key": "title_main",
   "path": "assets/title/title_main.png",
   "w": 440,
   "h": 300,
   "bytes": 23250,
   "sha256": "b1509ce4ecb1cf9cc50975fc6cf447c1ced968ab9fc283caa83d3cad05443741",
   "alpha": true,
   "source": "system-font-render(STXINGKA)+palette",
   "anchor": [
    0.5,
    0.5
   ],
   "frames": null
  }
 ],
 "subpackages": [
  {
   "key": "flash_01",
   "name": "雨夜素面",
   "dir": "subpackages/memory",
   "assets": [
    {
     "key": "flash_01_1",
     "path": "subpackages/memory/flash_01_1.jpg",
     "w": 480,
     "h": 854,
     "bytes": 120110,
     "sha256": "da24fd6e054e84c0dc35f3fe250d97dcf9248e07fc4e08bc641a22a3539f0903",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 1,
     "segment": 1
    },
    {
     "key": "flash_01_2",
     "path": "subpackages/memory/flash_01_2.jpg",
     "w": 480,
     "h": 854,
     "bytes": 107064,
     "sha256": "aaffd0d2d4999eed264f5d06e3bec772edebdc219a38323fa96260a3dd15bd06",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 2,
     "segment": 1
    },
    {
     "key": "flash_01_3",
     "path": "subpackages/memory/flash_01_3.jpg",
     "w": 480,
     "h": 854,
     "bytes": 60787,
     "sha256": "d16f4ce43746cde29c21720ef87c35e23576f79b2a4dfca35752b7fdf3a0039b",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 3,
     "segment": 1
    },
    {
     "key": "flash_01_4",
     "path": "subpackages/memory/flash_01_4.jpg",
     "w": 480,
     "h": 854,
     "bytes": 82308,
     "sha256": "570cfdb3fe2ec0102e26df3570c31324bc222910f46c13b4acd0c63f645e7be4",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 4,
     "segment": 1
    },
    {
     "key": "flash_01_5",
     "path": "subpackages/memory/flash_01_5.jpg",
     "w": 480,
     "h": 854,
     "bytes": 152115,
     "sha256": "182a369d5be79429d105a24b2961cfe31cf7d26a825f2f75636d1fb6e0c9be92",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 5,
     "segment": 1
    }
   ]
  },
  {
   "key": "flash_02",
   "name": "雪夜分面",
   "dir": "subpackages/memory",
   "assets": [
    {
     "key": "flash_02_1",
     "path": "subpackages/memory/flash_02_1.jpg",
     "w": 480,
     "h": 854,
     "bytes": 107990,
     "sha256": "977773d7b2e22114047e4fc05b115b2e23bc54493a47cae91c6560c6518f6fb3",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 1,
     "segment": 2
    },
    {
     "key": "flash_02_2",
     "path": "subpackages/memory/flash_02_2.jpg",
     "w": 480,
     "h": 854,
     "bytes": 99273,
     "sha256": "933145a66dbfdaa60bb1b5ba92de77cf40e498148524d11b3ca251b76f62817e",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 2,
     "segment": 2
    },
    {
     "key": "flash_02_3",
     "path": "subpackages/memory/flash_02_3.jpg",
     "w": 480,
     "h": 854,
     "bytes": 81006,
     "sha256": "942a484d6b8860fb85b92fc403798ba8b3462720b9e7c34f8c639e4deae09e05",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 3,
     "segment": 2
    },
    {
     "key": "flash_02_4",
     "path": "subpackages/memory/flash_02_4.jpg",
     "w": 480,
     "h": 854,
     "bytes": 85091,
     "sha256": "eaf22f4267c0e9071b7e517c0a113f5e20818557a8fb47870a0d4900f5b5f734",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 4,
     "segment": 2
    },
    {
     "key": "flash_02_5",
     "path": "subpackages/memory/flash_02_5.jpg",
     "w": 480,
     "h": 854,
     "bytes": 85481,
     "sha256": "64558524668b9dfc9372ac0c869836db93ca87fb6c3c7ffa17cf34f065e33f35",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 5,
     "segment": 2
    }
   ]
  },
  {
   "key": "flash_03",
   "name": "云外最后一夜",
   "dir": "subpackages/memory",
   "assets": [
    {
     "key": "flash_03_1",
     "path": "subpackages/memory/flash_03_1.jpg",
     "w": 480,
     "h": 854,
     "bytes": 114912,
     "sha256": "cac304a6b82d4186d2d2e00de742a266a8107c6addce19eb7560d0ed492f4043",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 1,
     "segment": 3
    },
    {
     "key": "flash_03_2",
     "path": "subpackages/memory/flash_03_2.jpg",
     "w": 480,
     "h": 854,
     "bytes": 91307,
     "sha256": "e249e1a970b538e0d7e6a33510e53765c6545e1412ec8b91bce2acaeb8954451",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 2,
     "segment": 3
    },
    {
     "key": "flash_03_3",
     "path": "subpackages/memory/flash_03_3.jpg",
     "w": 480,
     "h": 854,
     "bytes": 64983,
     "sha256": "c3660b1db69081b734848f4b24a4f6ea6addcf6b5cb8a395d76526df40a6ef16",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 3,
     "segment": 3
    },
    {
     "key": "flash_03_4",
     "path": "subpackages/memory/flash_03_4.jpg",
     "w": 480,
     "h": 854,
     "bytes": 69148,
     "sha256": "2fb7499694e0171f6737273841f4bf2ecc0ea87423470d3ed75da6beb4c60c11",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 4,
     "segment": 3
    },
    {
     "key": "flash_03_5",
     "path": "subpackages/memory/flash_03_5.jpg",
     "w": 480,
     "h": 854,
     "bytes": 119373,
     "sha256": "c5d0f8950dd8c4eae0cd473beba2bfe0c6d6b4bed6a95ebe259711fa4141d87c",
     "alpha": false,
     "anchor": [
      0,
      0
     ],
     "frames": null,
     "source": "seedream+cover(480x854)",
     "seq": 5,
     "segment": 3
    }
   ]
  }
 ]
};

};
__defs["src/scenes/splash.js"]=function(module,exports,__req){
// P1 启动页：标题 + 《健康游戏忠告》全文 + 轻触开始（合规 3.2.6 第 2 条）
// 布局自适应：短屏/方屏（PC 微信窗口）下先缩标题，再兜底压缩按钮高度，保证不压标题
const C = __req("src/config.js");
const T = __req("src/text.js");
const UI = __req("src/ui.js");

module.exports = {
  enter() {
    this.t = 0;
    this.promptRect = null;
  },
  update(dt) {
    this.t += dt;
  },
  draw(ctx, app) {
    const W = app.W;
    const H = app.H;
    UI.drawBgCover(ctx, app, 'bg_tian_dusk', UI.PALETTE.dusk);

    // 先算底部锚定的忠告面板
    const panelW = W - C.MARGIN * 2;
    const fs = 26;
    const lines = T.wrap(ctx, C.HEALTH_ADVICE, panelW - 48, fs);
    const lh = fs * 1.6;
    const panelH = lines.length * lh + 44;
    const panelY = app.bottomY - panelH;

    // 标题与按钮的自适应几何
    const titleImg = app.assets.img('title_main');
    const topMin = C.SAFE_TOP + 44;
    const titleY = Math.max(topMin, Math.round(H * 0.13));
    const baseTitleW = 460;
    const baseTitleH = titleImg && titleImg.width
      ? (titleImg.height / titleImg.width) * baseTitleW
      : 68 * 1.5 + 40;
    let titleW = baseTitleW;
    let titleH = baseTitleH;

    const bw = Math.min(440, W - C.MARGIN * 2);
    let bh = 88;
    const gapBtn = 64; // 按钮与忠告面板的常规间距
    const minGap = 24; // 标题与按钮的最小间距
    let by = panelY - gapBtn - bh;

    // 标题放不下就按比例缩（最小 30%）；连 60 高度都挤不出来时直接不画标题，
    // 合规区块（忠告 + 适龄）优先可见 —— 极端横向短屏（PC 端窗口被拉扁）走这条
    const maxTitleH = by - minGap - titleY;
    let drawTitle = true;
    if (maxTitleH < 60) {
      drawTitle = false;
      titleH = 0;
    } else if (maxTitleH < titleH) {
      const k = Math.max(0.3, maxTitleH / baseTitleH);
      titleW = Math.max(150, Math.round(baseTitleW * k));
      titleH = titleImg && titleImg.width
        ? (titleImg.height / titleImg.width) * titleW
        : Math.round(baseTitleH * k);
    }
    by = Math.max(by, titleY + titleH + (drawTitle ? minGap : 0));
    // 极端短屏：按钮仍会越界就压按钮高度，绝不允许盖住忠告面板
    if (by + bh > panelY - 8) {
      by = Math.min(by, panelY - 8 - 64);
      bh = Math.max(64, panelY - 8 - by);
    }

    // 画标题（极端短屏会给合规区块让位）
    if (drawTitle) {
      if (titleImg && titleImg.width) {
        ctx.drawImage(titleImg, (W - titleW) / 2, titleY, titleW, titleH);
      } else {
        T.drawLines(ctx, [C.GAME_NAME], W / 2, titleY, {
          size: Math.round(68 * (titleW / baseTitleW)),
          bold: true,
          align: 'center',
          color: '#F7E7C6',
          stroke: '#1B2A41',
          strokeWidth: 7,
          shadow: 'rgba(0,0,0,0.55)',
          shadowBlur: 12
        });
      }
    }

    // 适龄提示 8+（宽度按实测文字算，避免被右边缘切）
    const ageW = Math.ceil(T.measure(ctx, C.AGE_TIP, 24, false)) + 40;
    UI.badge(ctx, W - C.MARGIN - ageW, C.SAFE_TOP, ageW, 54, C.AGE_TIP, {
      size: 24
    });

    // 《健康游戏忠告》全文
    UI.panel(ctx, C.MARGIN, panelY, panelW, panelH, {
      fill: 'rgba(12,16,26,0.88)',
      border: 'rgba(242,181,68,0.35)',
      radius: 16
    });
    T.drawLines(ctx, lines, C.MARGIN + 24, panelY + 22, {
      size: fs,
      color: '#F5EFE3',
      lineHeight: 1.6
    });

    // 轻触开始：暗底胶囊（浅云海上也要读得清）
    const pulse = 0.55 + 0.25 * Math.sin(this.t * 2.2);
    UI.button(ctx, (W - bw) / 2, by, bw, bh, '轻触屏幕，点一盏灯', {
      bg: 'rgba(14,18,30,0.86)',
      border: 'rgba(242,181,68,' + pulse.toFixed(2) + ')',
      color: '#F2B544',
      size: bh < 76 ? 26 : 32,
      shadow: 'rgba(0,0,0,0.45)'
    });
    this.promptRect = { x: (W - bw) / 2, y: by, w: bw, h: bh };
    // 布局自查用（冒烟测试读这里核安全区与重叠）
    this.metrics = {
      panelY: panelY,
      panelH: panelH,
      panelBottom: panelY + panelH,
      promptY: by,
      promptRect: this.promptRect,
      adviceLines: lines.length,
      titleY: titleY,
      titleBottom: titleY + titleH,
      titleHidden: !drawTitle,
      btnBottom: by + bh
    };
  },
  onTap(x, y, app) {
    if (this.promptRect && UI.hit(this.promptRect, x, y)) app.setScene('info');
  }
};

};
__defs["src/scenes/info.js"]=function(module,exports,__req){
// P2 信息页：必须在《健康游戏忠告》之后、游戏开始之前（合规 3.2.6 第 1 条）
// 字段口径按铺货席 2026-11-08 定稿：无版号 → 版号三项标「暂无」，绝不编号
const C = __req("src/config.js");
const T = __req("src/text.js");
const UI = __req("src/ui.js");

module.exports = {
  enter() {
    this.t = 0;
    this.rect = null;
  },
  update(dt) {
    this.t += dt;
  },
  draw(ctx, app) {
    const W = app.W;
    const H = app.H;
    UI.drawBgCover(ctx, app, 'bg_tian_dusk', UI.PALETTE.dusk);
    ctx.fillStyle = 'rgba(8,10,18,0.72)';
    ctx.fillRect(0, 0, W, H);

    const pw = W - C.MARGIN * 2;
    const rows = [
      '游戏名称：' + C.GAME_NAME,
      '著作权人：' + C.INFO.author,
      '出版服务单位、批准文号、出版物号：' + C.INFO.publish,
      '备案号：' + C.INFO.record,
      '版本：' + C.INFO.version,
      '适龄提示：8+',
      '《健康游戏忠告》已在启动页全文登载',
      C.INFO.note
    ];

    const fs = 26;
    const textW = pw - 48;
    let lines = [];
    rows.forEach((row) => {
      const ws = T.wrap(ctx, row, textW, fs);
      lines = lines.concat(ws);
      lines.push(''); // 行间留空
    });
    if (lines.length && lines[lines.length - 1] === '') lines.pop();

    const lh = fs * 1.55;
    const headH = 120;
    const panelH = lines.length * lh + 56;
    const btnH = 96;
    const btnY = app.bottomY - btnH;
    let panelY = (H - panelH) / 2;
    const maxPanelBottom = btnY - 56;
    if (panelY + panelH > maxPanelBottom) panelY = maxPanelBottom - panelH;

    T.drawLines(ctx, ['关于本游戏'], W / 2, C.SAFE_TOP, {
      size: 40,
      bold: true,
      align: 'center',
      color: '#F7E7C6',
      stroke: 'rgba(10,12,20,0.8)',
      strokeWidth: 4
    });

    UI.panel(ctx, C.MARGIN, panelY, pw, panelH, {
      fill: 'rgba(12,16,26,0.9)',
      border: 'rgba(242,181,68,0.32)',
      radius: 18
    });
    T.drawLines(ctx, lines, C.MARGIN + 24, panelY + 28, {
      size: fs,
      color: '#EFE7D8',
      lineHeight: 1.55
    });

    const bw = 420;
    this.rect = UI.button(ctx, (W - bw) / 2, btnY, bw, btnH, '进入面馆', {
      bg: 'rgba(242,181,68,0.94)',
      color: '#1B2A41',
      size: 34,
      shadow: 'rgba(0,0,0,0.4)'
    });
    this.metrics = {
      panelY: panelY,
      panelH: panelH,
      panelBottom: panelY + panelH,
      btnY: btnY,
      rows: lines.length
    };
  },
  onTap(x, y, app) {
    if (this.rect && UI.hit(this.rect, x, y)) app.setScene('market');
  }
};

};
__defs["src/scenes/market.js"]=function(module,exports,__req){
// 云市：买卖食材、开箱、还账、开摊（交易系统所在地）
const C = __req("src/config.js");
const T = __req("src/text.js");
const UI = __req("src/ui.js");
const D = __req("src/data/goods.js");
const G = __req("src/systems/game.js");

const ROW_IDS = ['noodle', 'soup', 'scallion', 'egg', 'greens', 'fire', 'cloud_tea', 'amber_sugar'];

module.exports = {
  enter(app) {
    this.t = 0;
    this.msg = '';
    this.msgT = 0;
    this.hits = [];
    this.listTop = 0;
    this.rowH = 0;
    G.load();
  },
  update(dt) {
    this.t += dt;
    if (this.msgT > 0) this.msgT -= dt;
  },
  say(r) {
    if (r && r.msg) {
      this.msg = r.msg;
      this.msgT = 2.4;
    }
  },
  draw(ctx, app) {
    const W = app.W;
    const H = app.H;
    const bottomY = app.bottomY;
    const st = G.S;
    UI.drawBgCover(ctx, app, 'bg_cloud_market', UI.PALETTE.dusk);
    ctx.fillStyle = 'rgba(8,10,18,0.45)';
    ctx.fillRect(0, 0, W, H);

    // 抬头：日 / 三币
    T.drawLines(ctx, ['第 ' + st.day + ' 日 · 云市'], C.MARGIN, C.SAFE_TOP, {
      size: 38,
      bold: true,
      color: '#F7E7C6',
      stroke: 'rgba(10,12,20,0.75)',
      strokeWidth: 4
    });
    T.drawLines(ctx, ['文钱 ' + st.coins + ' · 香火 ' + st.incense + ' · 欠商盟 ' + st.debt + '（今日至少还 ' + st.debtMin + '）'],
      C.MARGIN, C.SAFE_TOP + 58, { size: 24, color: '#F2B544' });

    // 价目表
    const listTop = C.SAFE_TOP + 110;
    const rowH = 88;
    this.listTop = listTop;
    this.rowH = rowH;
    this.hits = [];
    ROW_IDS.forEach((id, i) => {
      const g = D.byId(id);
      const y = listTop + i * rowH;
      const p = G.priceOf(id);
      UI.panel(ctx, C.MARGIN, y, W - C.MARGIN * 2, rowH - 8, {
        fill: 'rgba(12,16,26,0.72)',
        radius: 12
      });
      T.drawLines(ctx, [g.name], C.MARGIN + 20, y + 12, { size: 26, color: '#F5EFE3' });
      T.drawLines(ctx, ['库存 ' + G.stockCount(id)], C.MARGIN + 220, y + 14, { size: 22, color: '#EFE7D8' });
      T.drawLines(ctx, [p === null ? '今日不到货' : p + ' 文'], C.MARGIN + 360, y + 12, {
        size: p === null ? 22 : 26,
        color: p === null ? 'rgba(239,231,216,0.5)' : '#F2B544'
      });
      const bx = W - C.MARGIN - 168;
      const b1 = UI.button(ctx, bx, y + 12, 78, 56, '买', { size: 26, bg: 'rgba(242,181,68,0.9)' });
      const b2 = UI.button(ctx, bx + 90, y + 12, 78, 56, '卖', { size: 26, bg: 'rgba(242,181,68,0.35)', color: '#F5EFE3' });
      this.hits.push({ rect: b1, action: 'buy', id: id });
      this.hits.push({ rect: b2, action: 'sell', id: id });
    });

    // 提示条
    if (this.msgT > 0) {
      T.drawLines(ctx, [this.msg], C.MARGIN, listTop + ROW_IDS.length * rowH + 6, {
        size: 24,
        color: '#8CF3A6'
      });
    }

    // 底部三键：开箱 / 还账 / 开摊
    const by = bottomY - 104;
    const bw = (W - C.MARGIN * 2 - 24) / 3;
    const btns = [
      { label: '开箱', bg: 'rgba(242,181,68,0.55)' },
      { label: '还账', bg: 'rgba(242,181,68,0.55)' },
      { label: '开摊', bg: 'rgba(242,181,68,0.95)' }
    ];
    this.bigBtns = btns.map((b, i) => {
      const r = UI.button(ctx, C.MARGIN + i * (bw + 12), by, bw, 104, b.label, {
        size: 30,
        bg: b.bg,
        color: i === 2 ? '#1B2A41' : '#F5EFE3'
      });
      return { rect: r, action: ['box', 'repay', 'open'][i] };
    });
  },
  onTap(x, y, app) {
    for (let i = 0; i < this.hits.length; i++) {
      const h = this.hits[i];
      if (!UI.hit(h.rect, x, y)) continue;
      this.say(h.action === 'buy' ? G.buy(h.id, 1) : G.sell(h.id, 1));
      return;
    }
    for (let i = 0; i < (this.bigBtns || []).length; i++) {
      const b = this.bigBtns[i];
      if (!UI.hit(b.rect, x, y)) continue;
      if (b.action === 'box') this.say(G.openBox());
      else if (b.action === 'repay') this.say(G.repay());
      else {
        G.startNight();
        app.setScene('night');
      }
      return;
    }
  }
};

};
__defs["src/scenes/night.js"]=function(module,exports,__req){
// 夜局：客单 → 切配 → 控火 → 捞面 → 结算 → 三选一
const C = __req("src/config.js");
const T = __req("src/text.js");
const UI = __req("src/ui.js");
const D = __req("src/data/goods.js");
const G = __req("src/systems/game.js");

const CUT_IDS = ['noodle', 'soup', 'scallion', 'egg', 'greens', 'fire'];

// 改良牌 → 图集帧（16 格里用 12 格，其余备用）
const CARD_FRAME = {
  old_soup: 'card_old_soup',
  dual_pot: 'card_double_pot',
  charred: 'card_charred',
  reheat: 'card_echo',
  trader: 'card_abacus',
  timer: 'card_hourglass',
  quick_knife: 'card_cleaver',
  slow_fire: 'card_flame',
  incense: 'card_lantern',
  good_stock: 'card_cupped_hands',
  clear_soup: 'card_plain_bowl',
  notes: 'card_journal'
};

module.exports = {
  enter() {
    this.t = 0;
    this.pickRects = [];
    this.cutRects = [];
    this.serveRect = null;
    this.potRect = null;
    this.contRect = null;
    this.endTimer = 0;
  },
  update(dt, app) {
    this.t += dt;
    G.updateHeat(dt);
    const N = G.N;
    if (N.phase === 'result') {
      this.endTimer += dt;
      if (this.endTimer > 1.6) {
        this.endTimer = 0;
        G.nextGuest();
        if (G.N.phase === 'summary') {
          /* 停在结算页 */
        }
      }
    }
  },
  onTouchDown(x, y, app) {
    if (G.N.phase !== 'cook') return;
    if (this.potRect && UI.hit(this.potRect, x, y)) G.N.hold = true;
  },
  onTouchUp() {
    G.N.hold = false;
  },
  onTap(x, y, app) {
    const N = G.N;
    if (N.phase === 'pick') {
      for (let i = 0; i < this.pickRects.length; i++) {
        const r = this.pickRects[i];
        if (UI.hit(r.rect, x, y)) {
          G.chooseCard(r.id);
          return;
        }
      }
      return;
    }
    if (N.phase === 'cook') {
      for (let i = 0; i < this.cutRects.length; i++) {
        const r = this.cutRects[i];
        if (UI.hit(r.rect, x, y)) {
          G.cut(r.id);
          return;
        }
      }
      if (this.serveRect && UI.hit(this.serveRect, x, y)) G.serve();
      return;
    }
    if (N.phase === 'summary') {
      if (this.contRect && UI.hit(this.contRect, x, y)) app.setScene('market');
    }
  },
  draw(ctx, app) {
    const W = app.W;
    const H = app.H;
    const bottomY = app.bottomY;
    const N = G.N;
    UI.drawBgCover(ctx, app, 'bg_tian_dusk', UI.PALETTE.dusk);

    // 三选一 / 结算 是覆盖层，先画它们，避免和局内抬头叠字
    if (N.phase === 'pick') {
      this.drawPick(ctx, app);
      return;
    }
    if (N.phase === 'summary') {
      this.drawSummary(ctx, app);
      return;
    }

    // 抬头
    T.drawLines(ctx, ['第 ' + N.day + ' 夜 · 客 ' + Math.min(N.idx + 1, N.guests) + '/' + N.guests],
      C.MARGIN, C.SAFE_TOP, { size: 34, bold: true, color: '#F7E7C6', stroke: 'rgba(10,12,20,0.75)', strokeWidth: 4 });
    T.drawLines(ctx, ['本夜 ' + N.coins + ' 文 · 香火 ' + N.incense],
      C.MARGIN, C.SAFE_TOP + 52, { size: 24, color: '#F2B544' });

    const order = N.order;
    // 客单
    const pw = W - C.MARGIN * 2;
    const py = C.SAFE_TOP + 102;
    UI.panel(ctx, C.MARGIN, py, pw, 132, {
      fill: 'rgba(12,16,26,0.82)',
      border: 'rgba(242,181,68,0.3)',
      radius: 16
    });
    const needNames = order.need.map(function (n) { return D.byId(n.id).name; }).join(' + ');
    T.drawLines(ctx, [order.guestName + '：一碗「' + needNames + '」'], C.MARGIN + 24, py + 22, {
      size: 26, color: '#F5EFE3'
    });
    const prepTxt = order.need.map(function (n) {
      return D.byId(n.id).name + (N.prep.indexOf(n.id) >= 0 ? '✓' : '·');
    }).join('  ');
    T.drawLines(ctx, ['备料：' + prepTxt + '　（同类点 ' + G.cutNeed() + ' 次成一份）'], C.MARGIN + 24, py + 76, {
      size: 22, color: '#F2B544'
    });

    // 立绘（客人偏左）：尺寸压小，避免被锅区面板压住脸
    const guest = app.assets.img(order.guestKey);
    const groundY = C.GROUND_Y.bg_tian_dusk;
    const gh = 420;
    const gx = C.STAND_X.guest;
    if (guest && guest.width) {
      const gw = (guest.width / guest.height) * gh;
      const shadow = app.assets.img(C.SHADOW.key);
      if (shadow && shadow.width) {
        const sw = gw * C.SHADOW.scale;
        ctx.save();
        ctx.globalAlpha = C.SHADOW.alpha;
        ctx.drawImage(shadow, gx - sw / 2, groundY - C.SHADOW.lift - (sw * C.SHADOW.ratio) / 2, sw, sw * C.SHADOW.ratio);
        ctx.restore();
      }
      ctx.drawImage(guest, gx - gw / 2, groundY - gh, gw, gh);
    }

    // 食材按钮（3×2）
    const gridTop = 470;
    const bw = (W - C.MARGIN * 2 - 24) / 3;
    const bh = 96;
    this.cutRects = CUT_IDS.map((id, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = C.MARGIN + col * (bw + 12);
      const y = gridTop + row * (bh + 12);
      const g = D.byId(id);
      UI.panel(ctx, x, y, bw, bh, {
        fill: 'rgba(12,16,26,0.78)',
        border: 'rgba(242,181,68,0.3)',
        radius: 14
      });
      UI.drawFrame(ctx, app.assets.img(g.atlas), app.assets.frameOf(g.atlas, g.frame), x + bw - 76, y + 16, 62, 62);
      T.drawLines(ctx, [g.name], x + 14, y + 18, { size: 24, color: '#F5EFE3' });
      const buf = N.cutBuf[id] || 0;
      T.drawLines(ctx, ['×' + G.stockCount(id) + (buf ? '  ' + buf + '/' + G.cutNeed() : '')], x + 14, y + 62, {
        size: 22,
        color: buf ? '#8CF3A6' : '#F2B544'
      });
      return { rect: { x: x, y: y, w: bw, h: bh }, id: id };
    });

    // 锅与火候条
    const potY = 700;
    const potH = 150;
    this.potRect = { x: C.MARGIN, y: potY, w: W - C.MARGIN * 2, h: potH };
    UI.panel(ctx, C.MARGIN, potY, W - C.MARGIN * 2, potH, {
      fill: 'rgba(12,16,26,0.7)',
      border: 'rgba(242,181,68,0.3)',
      radius: 16
    });
    const barX = C.MARGIN + 24;
    const barW = W - C.MARGIN * 2 - 48;
    const barY = potY + 54;
    const barH = 40;
    UI.panel(ctx, barX, barY, barW, barH, { fill: 'rgba(10,12,20,0.62)', radius: barH / 2 });
    // 目标带
    const lo = order.band[0] / 100;
    const hi = order.band[1] / 100;
    ctx.save();
    ctx.fillStyle = 'rgba(140,243,166,0.35)';
    ctx.fillRect(barX + barW * lo, barY, barW * (hi - lo), barH);
    // 火候针
    const hx = barX + barW * (N.heat / 100);
    ctx.fillStyle = N.burnt ? '#C4452C' : '#F2B544';
    ctx.fillRect(hx - 5, barY - 6, 10, barH + 12);
    ctx.restore();
    T.drawLines(ctx, [N.burnt ? '糊了：这碗自己吃' : (N.hold ? '加火中…' : '按住锅加火，松开压火')],
      C.MARGIN + 24, potY + 16, { size: 24, color: N.burnt ? '#E07A6B' : '#EFE7D8' });

    // 捞面
    const serveY = bottomY - 104;
    const can = G.prepDone() && !N.burnt;
    this.serveRect = UI.button(ctx, C.MARGIN, serveY, W - C.MARGIN * 2, 104, '捞面出餐', {
      size: 36,
      bg: can ? 'rgba(242,181,68,0.95)' : 'rgba(242,181,68,0.32)',
      color: '#1B2A41'
    });
    if (N.msgT > 0 && N.msg) {
      T.drawLines(ctx, [N.msg], C.MARGIN, potY + potH + 12, { size: 26, color: '#8CF3A6' });
    }
    // 调参面板（只在 ?tune= 生效的调试页出现）
    const TUNE = __req("src/systems/tune.js").T;
    if (TUNE.active) {
      T.drawLines(
        ctx,
        ['调参 火速 ' + TUNE.fire + ' · 备料 ' + TUNE.prep + ' · 浮动 ' + TUNE.price + ' · 糊阈 ' + TUNE.burn],
        C.MARGIN, potY + potH + 56, { size: 20, color: 'rgba(140,243,166,0.8)' }
      );
    }
  },

  drawPick(ctx, app) {
    const W = app.W;
    const H = app.H;
    const N = G.N;
    ctx.fillStyle = 'rgba(6,8,14,0.72)';
    ctx.fillRect(0, 0, W, H);
    T.drawLines(ctx, ['今夜改良'], W / 2, C.SAFE_TOP + 40, {
      size: 44, bold: true, align: 'center', color: '#F7E7C6',
      stroke: 'rgba(10,12,20,0.8)', strokeWidth: 4
    });
    this.pickRects = N.offers.map((card, i) => {
      const h = 210;
      const y = C.SAFE_TOP + 140 + i * (h + 24);
      const r = UI.button(ctx, C.MARGIN, y, W - C.MARGIN * 2, h, '', {
        bg: 'rgba(18,22,34,0.9)', border: 'rgba(242,181,68,0.45)', radius: 18
      });
      const frame = CARD_FRAME[card.id];
      const icon = frame ? app.assets.frameOf('ui_cards_atlas', frame) : null;
      UI.drawFrame(ctx, app.assets.img('ui_cards_atlas'), icon, C.MARGIN + 26, y + 30, 148, 148);
      T.drawLines(ctx, [card.name], C.MARGIN + 200, y + 34, { size: 34, bold: true, color: '#F2B544' });
      T.drawLines(ctx, T.wrap(ctx, card.desc, W - C.MARGIN * 2 - 240, 26), C.MARGIN + 200, y + 104, {
        size: 26,
        color: '#F5EFE3',
        lineHeight: 1.5
      });
      return { rect: r, id: card.id };
    });
  },

  drawSummary(ctx, app) {
    const W = app.W;
    const N = G.N;
    ctx.fillStyle = 'rgba(6,8,14,0.72)';
    ctx.fillRect(0, 0, W, app.H);
    const pw = W - C.MARGIN * 2;
    const py = Math.round(app.H * 0.20);
    const ph = 480;
    UI.panel(ctx, C.MARGIN, py, pw, ph, {
      fill: 'rgba(12,16,26,0.92)', border: 'rgba(242,181,68,0.4)', radius: 18
    });
    T.drawLines(ctx, ['收摊'], W / 2, py + 24, {
      size: 44, bold: true, align: 'center', color: '#F7E7C6'
    });

    // 手记残页插画（素材到位就画图，缺图降级成纸色底）
    const jp = app.assets.img('journal_page');
    const ix = C.MARGIN + 26;
    const iy = py + 116;
    const iw = 280;
    const ih = 210;
    if (jp && jp.width) {
      ctx.drawImage(jp, ix, iy, iw, ih);
    } else {
      UI.panel(ctx, ix, iy, iw, ih, {
        fill: 'rgba(226,206,164,0.16)',
        border: 'rgba(242,181,68,0.3)',
        radius: 10
      });
      T.drawLines(ctx, ['手记残页'], ix + 24, iy + 84, { size: 28, color: '#E2CEA4' });
    }

    T.drawLines(ctx, [
      '今夜 ' + N.total + ' 位客人',
      '进账 ' + N.coins + ' 文',
      '香火 ' + N.incense,
      '欠商盟 ' + G.S.debt + ' 文',
      '手记残页 +1'
    ], ix + iw + 38, iy + 6, { size: 26, color: '#F5EFE3', lineHeight: 1.7 });

    this.contRect = UI.button(ctx, C.MARGIN + 24, py + ph - 124, pw - 48, 96, '明日再开摊', {
      size: 32, bg: 'rgba(242,181,68,0.95)', color: '#1B2A41'
    });
  }
};

};
__defs["src/scenes/board.js"]=function(module,exports,__req){
// 备料案板（三消本体，可单跑）：?scene=board
// 5×5 棋盘，交换相邻成三连 → 上菜进度 +1、连击压火；火候满 100 糊锅结束本夜
// 视觉：暖木案板 + 每个食材按色相区分的格底/色环/角标（不改素材，只改底衬），金框=特效块
const C = __req("src/config.js");
const T = __req("src/text.js");
const UI = __req("src/ui.js");
const D = __req("src/data/goods.js");
const { Board, TARGET_PER_GUEST, HEAT_MAX } = __req("src/systems/board.js");

const CELL = 116;
const GAP = 8;

// 五类食材按色相拉开：面黄 / 汤白 / 葱亮绿 / 蛋橙红 / 青菜深绿
const KIND_TINT = {
  noodle: '#E8C15A',
  soup: '#F5EFE3',
  scallion: '#8FD16A',
  egg: '#E2622E',
  greens: '#3F7D45'
};

module.exports = {
  enter() {
    this.board = new Board(20261108);
    this.sel = null;
    this.msg = '';
    this.msgT = 0;
    this.t = 0;
  },
  update(dt) {
    this.t += dt;
    if (this.msgT > 0) this.msgT -= dt;
    this.board.updateHeat(dt);
  },
  onTap(x, y, app) {
    const b = this.board;
    if (b.over) {
      if (this.resetRect && UI.hit(this.resetRect, x, y)) {
        this.board = new Board((Date.now() % 100000) + 7);
        this.sel = null;
        this.msg = '';
      }
      return;
    }
    const g = this.gridRect;
    if (!g || !UI.hit(g, x, y)) return;
    const cx = Math.floor((x - g.x) / (CELL + GAP));
    const cy = Math.floor((y - g.y) / (CELL + GAP));
    if (cx < 0 || cy < 0 || cx >= b.cols || cy >= b.rows) return;
    if (!this.sel) {
      this.sel = { x: cx, y: cy };
      return;
    }
    const s = this.sel;
    if (s.x === cx && s.y === cy) {
      this.sel = null;
      return;
    }
    const r = b.trySwap(s.x, s.y, cx, cy);
    this.sel = null;
    if (!r.ok) {
      this.msg = r.msg;
      this.msgT = 1.2;
      return;
    }
    this.msg = '消 ' + r.cleared + ' 格 · 连击 ' + r.combo + ' · 进度 ' + r.progress;
    this.msgT = 1.4;
  },
  draw(ctx, app) {
    const W = app.W;
    const H = app.H;
    const b = this.board;
    UI.drawBgCover(ctx, app, 'bg_tian_dusk', UI.PALETTE.dusk);

    // 抬头
    T.drawLines(ctx, ['备料案板 · 第 ' + (b.guestsServed() + 1) + ' 客'], C.MARGIN, C.SAFE_TOP, {
      size: 34,
      bold: true,
      color: '#F7E7C6',
      stroke: 'rgba(10,12,20,0.75)',
      strokeWidth: 4
    });
    T.drawLines(ctx, ['上菜进度 ' + b.progressToGuest() + '/' + TARGET_PER_GUEST + ' · 已出 ' + b.guestsServed() + ' 碗'],
      C.MARGIN, C.SAFE_TOP + 52, { size: 23, color: '#F2B544' });

    // 火候压力条（标题在条上方，不再压字）
    const barX = C.MARGIN;
    const barW = W - C.MARGIN * 2;
    const barY = C.SAFE_TOP + 112;
    const barH = 26;
    T.drawLines(ctx, ['火候'], W - C.MARGIN - 64, barY - 30, { size: 22, color: '#EFE7D8' });
    UI.panel(ctx, barX, barY, barW, barH, { fill: 'rgba(10,12,20,0.6)', radius: barH / 2 });
    const p = Math.min(1, b.heat / HEAT_MAX);
    ctx.save();
    ctx.fillStyle = p > 0.82 ? '#C4452C' : p > 0.6 ? '#E0A33C' : '#F2B544';
    ctx.fillRect(barX + 3, barY + 3, (barW - 6) * p, barH - 6);
    ctx.restore();

    // 案板木台
    const boardW = b.cols * CELL + (b.cols - 1) * GAP;
    const boardH = b.rows * CELL + (b.rows - 1) * GAP;
    const gx = Math.round((W - boardW) / 2);
    const gy = C.SAFE_TOP + 190;
    UI.panel(ctx, C.MARGIN - 8, gy - 24, W - (C.MARGIN - 8) * 2, boardH + 48, {
      fill: 'rgba(96,66,42,0.94)',
      border: 'rgba(242,181,68,0.28)',
      radius: 22
    });
    // 案板木纹（三条横线）
    ctx.save();
    ctx.strokeStyle = 'rgba(60,38,22,0.35)';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(C.MARGIN - 8, gy - 24 + i * (boardH + 48) / 4);
      ctx.lineTo(W - C.MARGIN + 8, gy - 24 + i * (boardH + 48) / 4);
      ctx.stroke();
    }
    ctx.restore();

    this.gridRect = { x: gx, y: gy, w: boardW, h: boardH };
    for (let y = 0; y < b.rows; y++) {
      for (let x = 0; x < b.cols; x++) {
        const kind = b.at(x, y);
        const tx = gx + x * (CELL + GAP);
        const ty = gy + y * (CELL + GAP);
        const isSel = this.sel && this.sel.x === x && this.sel.y === y;
        const tint = KIND_TINT[kind] || '#F5EFE3';
        // 米白暖格底
        UI.panel(ctx, tx, ty, CELL, CELL, {
          fill: isSel ? 'rgba(255,240,210,0.98)' : 'rgba(246,236,218,0.94)',
          radius: 14
        });
        // 色环：按食材色相拉开区分度
        ctx.save();
        ctx.strokeStyle = tint;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(tx + CELL / 2, ty + CELL / 2, CELL / 2 - 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        // 左上角角标（静态下也能认色）
        ctx.save();
        ctx.fillStyle = tint;
        ctx.beginPath();
        ctx.arc(tx + 16, ty + 16, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (kind) {
          const gd = D.byId(kind);
          UI.drawFrame(
            ctx,
            app.assets.img(gd.atlas),
            app.assets.frameOf(gd.atlas, gd.frame),
            tx + 20,
            ty + 20,
            CELL - 40,
            CELL - 40
          );
        }
        if (isSel) {
          ctx.save();
          ctx.strokeStyle = 'rgba(242,181,68,0.95)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(tx + CELL / 2, ty + CELL / 2, CELL / 2 + 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // 客人（右下）与锅（左下），让案板读作「同一张桌子上」
    const guest = app.assets.img('ch_guest_peddler');
    const groundY = 1332;
    if (guest && guest.width) {
      const gh = 330;
      const gw = (guest.width / guest.height) * gh;
      const gxx = 604;
      const shadow = app.assets.img(C.SHADOW.key);
      if (shadow && shadow.width) {
        const sw = gw * C.SHADOW.scale;
        ctx.save();
        ctx.globalAlpha = C.SHADOW.alpha;
        ctx.drawImage(shadow, gxx - sw / 2, groundY - C.SHADOW.lift - (sw * C.SHADOW.ratio) / 2, sw, sw * C.SHADOW.ratio);
        ctx.restore();
      }
      ctx.drawImage(guest, gxx - gw / 2, groundY - gh, gw, gh);
    }
    const pot = D.byId('soup');
    UI.drawFrame(ctx, app.assets.img(pot.atlas), app.assets.frameOf(pot.atlas, 'item_pot'), 96, 1120, 120, 120);
    T.drawLines(ctx, ['灶台'], 120, 1250, { size: 22, color: '#EFE7D8' });

    // 提示 / 结算（紧贴案板下沿，不压客人与灶台）
    const hintY = gy + boardH + 18;
    UI.panel(ctx, C.MARGIN, hintY - 8, W - C.MARGIN * 2, 54, {
      fill: 'rgba(8,10,18,0.72)',
      radius: 12
    });
    if (this.msg && this.msgT > 0) {
      T.drawLines(ctx, [this.msg], C.MARGIN + 18, hintY, { size: 24, color: '#8CF3A6' });
    } else {
      T.drawLines(ctx, ['点第一块，再点相邻的第二块，换成一道工序'], C.MARGIN + 18, hintY, {
        size: 22,
        color: '#EFE7D8'
      });
    }

    if (b.over) {
      ctx.fillStyle = 'rgba(6,8,14,0.72)';
      ctx.fillRect(0, 0, W, H);
      const pw = W - C.MARGIN * 2;
      const py = Math.round(H * 0.3);
      UI.panel(ctx, C.MARGIN, py, pw, 300, {
        fill: 'rgba(12,16,26,0.94)',
        border: 'rgba(196,69,44,0.5)',
        radius: 18
      });
      T.drawLines(ctx, ['糊锅了'], W / 2, py + 30, { size: 48, bold: true, align: 'center', color: '#E07A6B' });
      T.drawLines(ctx, ['本夜结束，库存与等级不删', '已出 ' + b.guestsServed() + ' 碗'], W / 2, py + 116, {
        size: 26,
        align: 'center',
        color: '#F5EFE3',
        lineHeight: 1.6
      });
      this.resetRect = UI.button(ctx, C.MARGIN + 24, py + 200, pw - 48, 88, '再开一夜', {
        size: 32,
        bg: 'rgba(242,181,68,0.95)',
        color: '#1B2A41'
      });
    }
  }
};

};
__defs["src/scenes/play.js"]=function(module,exports,__req){
// P3 主游戏：8 夜叙事循环（剧情文本在 story.js，改台词不动这里）
// 判定：轻触「上菜」= 做对；长按 ≥0.6 秒 = 做错（临时判定入口，等「下料/控火」玩法层接进来再换）
const C = __req("src/config.js");
const T = __req("src/text.js");
const UI = __req("src/ui.js");
const Expr = __req("src/expr.js");
const STORY = __req("src/story.js");

const BG_KEY = 'bg_tian_dusk';
const HOLD_WRONG_SEC = 0.6;

function fmt(minutes) {
  const m = minutes % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
}

module.exports = {
  enter(app, params) {
    if (params && params.resume) {
      this.hold = null;
      return;
    }
    this.idx = 0;
    this.coins = 0;
    this.stamina = 100;
    this.time = 22 * 60 + 47;
    this.t = 0;
    this.hold = null;
    this.phase = 'idle';
    this.phaseT = 0;
    this.line = '';
    this.pendingFlash = null;
    this.expr = { eye: 'happy', mouth: 'smile', blush: false };
    this.btn = null;
    this.startNight(app, 0);
  },

  startNight(app, idx) {
    this.idx = idx;
    this.night = STORY.NIGHTS[idx];
    this.phase = 'enter';
    this.phaseT = 0;
    this.line = this.night.enter;
    this.time = 22 * 60 + 47;
    this.hold = null;
    // 上一夜做错没播的闪回，在这一夜开头补播（记忆不丢）
    if (this.pendingFlash) {
      const seg = this.pendingFlash;
      this.pendingFlash = null;
      app.setScene('flash', {
        seg: seg,
        next: 'play',
        text: STORY.FLASH_ALT[seg] || C.FLASH_TEXT[seg]
      });
    }
  },

  update(dt, app) {
    this.t += dt;
    this.phaseT += dt;
    if (this.hold) {
      this.hold.t += dt;
      if (this.hold.t >= HOLD_WRONG_SEC && this.phase === 'order') {
        this.hold = null;
        this.serve(app, false);
      }
    }
    if (this.phase === 'enter' && this.phaseT > 2.2) this.toOrder();
    else if (this.phase === 'result' && this.phaseT > 2.4) this.toClose();
    else if (this.phase === 'close' && this.phaseT > 1.8) this.nextNight(app);
  },

  toOrder() {
    this.phase = 'order';
    this.phaseT = 0;
    this.line = '';
  },
  toClose() {
    this.phase = 'close';
    this.phaseT = 0;
    this.line = this.night.close;
  },
  nextNight(app) {
    const night = this.night;
    if (night.final) {
      app.setScene('ending');
      return;
    }
    this.startNight(app, this.idx + 1);
  },

  serve(app, correct) {
    if (this.phase !== 'order') return;
    const night = this.night;
    this.coins += correct ? night.gain : night.loss;
    this.stamina = Math.max(0, this.stamina - (correct ? 6 : 10));
    this.time += 2;
    this.expr = correct
      ? { eye: 'happy', mouth: 'smile', blush: true }
      : { eye: 'normal', mouth: 'sad', blush: false };
    this.phase = 'result';
    this.phaseT = 0;
    this.line = correct ? night.right : night.wrong;

    if (night.flash) {
      if (correct) {
        app.setScene('flash', {
          seg: night.flash,
          next: 'play',
          text: C.FLASH_TEXT[night.flash]
        });
        return;
      }
      // 做错：闪回顺延到下一夜开头，片子不丢，只换轻说法
      this.pendingFlash = night.flash;
    }
  },

  onTouchDown(x, y, app) {
    if (this.phase !== 'order') return;
    if (this.btn && UI.hit(this.btn, x, y)) this.hold = { t: 0 };
  },
  onTap(x, y, app) {
    if (this.phase !== 'order') return;
    if (!this.btn || !UI.hit(this.btn, x, y)) return;
    this.hold = null;
    this.serve(app, true);
  },

  draw(ctx, app) {
    const W = app.W;
    const H = app.H;
    const bottomY = app.bottomY;
    const groundY = C.GROUND_Y[BG_KEY] || 1300;
    const night = this.night;
    UI.drawBgCover(ctx, app, BG_KEY, UI.PALETTE.dusk);

    // HUD：第 N 夜 + 时间
    T.drawLines(ctx, ['第 ' + night.n + ' 夜', fmt(this.time)], C.MARGIN, C.SAFE_TOP, {
      size: 36,
      bold: true,
      color: '#F7E7C6',
      lineHeight: 1.35,
      stroke: 'rgba(10,12,20,0.75)',
      strokeWidth: 4
    });

    // 体力：左侧纵向条（放在台词板下方，不压字）
    const barX = C.MARGIN;
    const barY = C.SAFE_TOP + 400;
    const barW = 20;
    const barH = 200;
    UI.panel(ctx, barX, barY, barW, barH, {
      fill: 'rgba(10,12,20,0.55)',
      border: 'rgba(10,12,20,0.35)',
      radius: barW / 2
    });
    const trackH = barH - 8;
    const fh = Math.max(2, trackH * (this.stamina / 100));
    ctx.save();
    ctx.fillStyle = '#F2B544';
    ctx.fillRect(barX + 5, barY + 4 + (trackH - fh), barW - 10, fh);
    ctx.restore();
    T.drawLines(ctx, ['体力'], barX, barY + barH + 12, { size: 22, color: '#EFE7D8' });

    // 客人立绘：脚底贴地面线，影子先画
    const cx = C.STAND_X.guest;
    const gh = Math.max(300, Math.min(620, groundY - (C.SAFE_TOP + 240)));
    const guest = app.assets.img(night.guest);
    const gw = guest && guest.width ? (guest.width / guest.height) * gh : gh * 0.5;

    const shadow = app.assets.img(C.SHADOW.key);
    if (shadow && shadow.width) {
      const sw = gw * C.SHADOW.scale;
      const shh = sw * C.SHADOW.ratio;
      ctx.save();
      ctx.globalAlpha = C.SHADOW.alpha;
      ctx.drawImage(shadow, cx - sw / 2, groundY - C.SHADOW.lift - shh / 2, sw, shh);
      ctx.restore();
    }
    if (guest && guest.width) {
      ctx.drawImage(guest, cx - gw / 2, groundY - gh, gw, gh);
    } else {
      Expr.drawPlaceholderHead(ctx, cx, groundY - 170, 84, this.expr);
    }

    // 台词板（顶部，避开头像与体力条）
    if (this.line) {
      const pw = W - C.MARGIN * 2;
      const fs = 28;
      const lines = T.wrap(ctx, night.name + '：' + this.line, pw - 48, fs);
      const lh = fs * 1.6;
      const ph = lines.length * lh + 44;
      const py = C.SAFE_TOP + 120;
      UI.panel(ctx, C.MARGIN, py, pw, ph, {
        fill: 'rgba(12,16,26,0.82)',
        border: 'rgba(242,181,68,0.3)',
        radius: 16
      });
      T.drawLines(ctx, lines, C.MARGIN + 24, py + 22, {
        size: fs,
        color: '#F5EFE3',
        lineHeight: 1.6
      });
    }

    // 订单面板 + 主按钮
    const btnH = 104;
    const btnY = bottomY - btnH;
    const ow = W - C.MARGIN * 2;
    const oh = 132;
    const oy = btnY - 28 - oh;
    UI.panel(ctx, C.MARGIN, oy, ow, oh, {
      fill: 'rgba(12,16,26,0.8)',
      border: 'rgba(242,181,68,0.3)',
      radius: 16
    });
    T.drawLines(ctx, ['客人的单：' + night.order], C.MARGIN + 24, oy + 24, {
      size: 26,
      color: '#F5EFE3',
      lineHeight: 1.5
    });
    T.drawLines(
      ctx,
      ['收入 ' + this.coins + ' 文 · 轻触上菜（长按试做错）'],
      C.MARGIN + 24,
      oy + 78,
      { size: 24, color: '#F2B544' }
    );

    const label = this.phase === 'order' ? '上菜' : '……';
    this.btn = UI.button(ctx, C.MARGIN, btnY, ow, btnH, label, {
      bg: this.phase === 'order' ? 'rgba(242,181,68,0.94)' : 'rgba(242,181,68,0.45)',
      color: '#1B2A41',
      size: 38,
      shadow: 'rgba(0,0,0,0.45)'
    });
  }
};

};
__defs["src/scenes/flash.js"]=function(module,exports,__req){
// 闪回播放层：分包静帧序列 + 推拉 + 溶解；分包失败降级为字幕 + 底色（不黑屏）
const C = __req("src/config.js");
const T = __req("src/text.js");
const UI = __req("src/ui.js");

const FRAME_SEC = 1.1;
const FADE_SEC = 0.4;
const KEN_BURNS = 0.06;

function drawCover(ctx, img, W, H, alpha, zoom) {
  if (!img || !img.width) return;
  const s = Math.max(W / img.width, H / img.height) * zoom;
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.globalAlpha = 1;
}

module.exports = {
  enter(app, params) {
    this.seg = (params && params.seg) || 'flash_01';
    this.next = (params && params.next) || 'play';
    this.text = (params && params.text) || C.FLASH_TEXT[this.seg] || '';
    this.imgs = null;
    this.failed = false;
    this.t = 0;
    this.done = false;
    app.assets.loadSegment(this.seg, (imgs) => {
      if (!imgs || !imgs.length) {
        this.failed = true; // 不置 done，保持可点继续，避免卡死
      } else {
        this.imgs = imgs;
      }
    });
  },

  update(dt, app) {
    if (this.done) return;
    this.t += dt;
    if (this.imgs && this.t >= this.imgs.length * FRAME_SEC) this.finish(app);
    else if (this.failed && this.t > 4) this.finish(app); // 降级 4 秒后自动继续
  },

  finish(app) {
    if (this.done) return;
    this.done = true;
    app.setScene(this.next, { resume: true });
  },

  draw(ctx, app) {
    const W = app.W;
    const H = app.H;
    ctx.fillStyle = '#0B0A12';
    ctx.fillRect(0, 0, W, H);

    if (this.imgs) {
      const p = this.t / FRAME_SEC;
      const idx = Math.min(this.imgs.length - 1, Math.floor(p));
      const frac = p - idx;
      const fadeFrac = FADE_SEC / FRAME_SEC;
      drawCover(ctx, this.imgs[idx], W, H, 1, 1 + KEN_BURNS * frac);
      if (idx + 1 < this.imgs.length && frac > 1 - fadeFrac) {
        const a = (frac - (1 - fadeFrac)) / fadeFrac;
        drawCover(ctx, this.imgs[idx + 1], W, H, Math.max(0, Math.min(1, a)), 1);
      }
    } else if (this.failed) {
      // 分包失败降级：底色 + 字幕，不黑屏
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1B2A41');
      g.addColorStop(1, '#3E2F5C');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // 字幕
    if (this.text) {
      const bw = W - C.MARGIN * 2;
      const lines = T.wrap(ctx, this.text, bw - 48, 30);
      const lh = 30 * 1.5;
      const bh = lines.length * lh + 44;
      const by = app.bottomY - bh - 56;
      UI.panel(ctx, C.MARGIN, by, bw, bh, {
        fill: 'rgba(10,12,20,0.62)',
        radius: 14
      });
      T.drawLines(ctx, lines, C.MARGIN + 24, by + 22, {
        size: 30,
        color: '#F5EFE3',
        lineHeight: 1.5,
        align: 'left'
      });
      // 轻触继续：放字幕面板下方，不压字
      T.drawLines(ctx, ['轻触继续'], W / 2, by + bh + 14, {
        size: 22,
        align: 'center',
        color: 'rgba(245,239,227,0.72)'
      });
    }
  },

  onTap(x, y, app) {
    this.finish(app);
  }
};

};
__defs["src/scenes/ending.js"]=function(module,exports,__req){
// 结局页：四段收束 + 重玩
const C = __req("src/config.js");
const T = __req("src/text.js");
const UI = __req("src/ui.js");
const STORY = __req("src/story.js");

module.exports = {
  enter() {
    this.t = 0;
    this.lines = 1;
    this.btn = null;
  },
  update(dt) {
    this.t += dt;
    // 每 2.2 秒推进一段，最后停在重玩按钮
    const want = Math.min(STORY.ENDING.length, 1 + Math.floor(this.t / 2.2));
    if (want > this.lines) this.lines = want;
  },
  draw(ctx, app) {
    const W = app.W;
    const H = app.H;
    UI.drawBgCover(ctx, app, 'bg_tian_cloud', UI.PALETTE.dusk);
    ctx.fillStyle = 'rgba(8,10,18,0.55)';
    ctx.fillRect(0, 0, W, H);

    // 标题
    T.drawLines(ctx, ['守夜'], W / 2, Math.round(H * 0.2), {
      size: 56,
      bold: true,
      align: 'center',
      color: '#F7E7C6',
      stroke: 'rgba(10,12,20,0.8)',
      strokeWidth: 5
    });

    // 逐渐浮现的四段
    const pw = W - C.MARGIN * 2;
    const shown = STORY.ENDING.slice(0, this.lines);
    const fs = 28;
    let lines = [];
    shown.forEach((s) => {
      lines = lines.concat(T.wrap(ctx, s, pw - 48, fs));
      lines.push('');
    });
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    const lh = fs * 1.7;
    const ph = lines.length * lh + 56;
    const py = Math.round(H * 0.3);
    UI.panel(ctx, C.MARGIN, py, pw, ph, {
      fill: 'rgba(12,16,26,0.8)',
      border: 'rgba(242,181,68,0.3)',
      radius: 18
    });
    T.drawLines(ctx, lines, C.MARGIN + 24, py + 28, {
      size: fs,
      color: '#F5EFE3',
      lineHeight: 1.7
    });

    if (this.lines >= STORY.ENDING.length) {
      const bw = 420;
      const bh = 96;
      this.btn = UI.button(ctx, (W - bw) / 2, app.bottomY - bh, bw, bh, '再守一夜', {
        bg: 'rgba(242,181,68,0.94)',
        color: '#1B2A41',
        size: 34,
        shadow: 'rgba(0,0,0,0.4)'
      });
    }
  },
  onTap(x, y, app) {
    if (this.btn && UI.hit(this.btn, x, y)) app.setScene('play');
  }
};

};
__defs["src/main.js"]=function(module,exports,__req){
// 启动装配：注册场景、加载资源、进入启动页（合规顺序：启动页 → 信息页 → 游戏）
const Engine = __req("src/engine.js");
const Assets = __req("src/assets.js");
const Splash = __req("src/scenes/splash.js");
const Info = __req("src/scenes/info.js");
const Play = __req("src/scenes/play.js");
const Flash = __req("src/scenes/flash.js");
const Ending = __req("src/scenes/ending.js");
const Market = __req("src/scenes/market.js");
const Night = __req("src/scenes/night.js");
const BoardScene = __req("src/scenes/board.js");

const app = new Engine();
app.assets = new Assets();

app.register('splash', Splash);
app.register('info', Info);
app.register('market', Market);
app.register('night', Night);
app.register('board', BoardScene);
app.register('play', Play);
app.register('flash', Flash);
app.register('ending', Ending);

app.setScene('splash');
app.start();

// 资源后台加载，不阻塞首帧；缺图时场景自动走渐变兜底
app.assets.load(
  null,
  function (loaded, failed) {
    if (failed) console.warn('[assets] 加载失败 ' + failed + ' 个');
  }
);

// 调试台用：?scene=play / ?scene=flash&seg=flash_02 直接进指定场景（仅浏览器环境生效）
const P = __req("src/platform.js");
if (!P.IS_WX && typeof window !== 'undefined' && window.location && window.location.search) {
  const kv = {};
  window.location.search
    .replace(/^\?/, '')
    .split('&')
    .forEach(function (p) {
      const i = p.indexOf('=');
      if (i > 0) kv[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1));
    });
  if (kv.scene) {
    // 调试直达夜局时先把一局跑起来，否则没有客单可画
    if (kv.scene === 'night') {
      const G = __req("src/systems/game.js");
      G.load();
      G.startNight();
      if (kv.phase === 'summary') {
        G.chooseCard(G.N.offers[0].id);
        G.N.total = 5;
        G.N.coins = 87;
        G.N.incense = 5;
        G.N.phase = 'summary';
      } else if (kv.phase !== 'pick') {
        G.chooseCard(G.N.offers[0].id);
      }
    }
    app.setScene(kv.scene, kv.seg ? { seg: kv.seg, next: 'play' } : {});
  }
  // ?probe=1：把实际量到的布局数字直接画在画面上，无头截图即可取证
  if (kv.probe) {
    const tick = function () {
      const m = (app.scene && app.scene.metrics) || {};
      app.overlay =
        'vw=' + app.vp.width + ' vh=' + app.vp.height + ' dpr=' + app.vp.dpr +
        ' realDpr=' + window.devicePixelRatio + ' s=' + app.s.toFixed(4) +
        '\nW=' + app.W + ' H=' + app.H.toFixed(1) + ' bottomY=' + app.bottomY.toFixed(1) +
        ' scene=' + app.sceneName +
        '\nmetrics=' + JSON.stringify(m);
    };
    tick();
    setInterval(tick, 200);
  }
}

module.exports = app;

};
__req("src/main.js");})();
