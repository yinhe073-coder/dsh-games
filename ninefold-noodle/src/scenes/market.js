// 云市：买卖食材、开箱、还账、开摊（交易系统所在地）
const C = require('../config');
const T = require('../text');
const UI = require('../ui');
const D = require('../data/goods');
const G = require('../systems/game');

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
