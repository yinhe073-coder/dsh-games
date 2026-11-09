// 经济 + 夜局状态（单一份状态机；场景只读状态、调这里的方法）
const P = require('../platform');
const D = require('../data/goods');
const CARDS = require('../data/cards');
const TUNE = require('./tune').T;

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
