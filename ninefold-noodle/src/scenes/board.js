// 备料案板（三消本体，可单跑）：?scene=board
// 5×5 棋盘，交换相邻成三连 → 上菜进度 +1、连击压火；火候满 100 糊锅结束本夜
// 视觉：暖木案板 + 每个食材按色相区分的格底/色环/角标（不改素材，只改底衬），金框=特效块
const C = require('../config');
const T = require('../text');
const UI = require('../ui');
const D = require('../data/goods');
const { Board, TARGET_PER_GUEST, HEAT_MAX } = require('../systems/board');

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
