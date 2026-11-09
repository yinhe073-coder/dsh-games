// 夜局：客单 → 切配 → 控火 → 捞面 → 结算 → 三选一
const C = require('../config');
const T = require('../text');
const UI = require('../ui');
const D = require('../data/goods');
const G = require('../systems/game');

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
    const TUNE = require('../systems/tune').T;
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
