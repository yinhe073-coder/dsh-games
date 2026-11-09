// P3 主游戏：8 夜叙事循环（剧情文本在 story.js，改台词不动这里）
// 判定：轻触「上菜」= 做对；长按 ≥0.6 秒 = 做错（临时判定入口，等「下料/控火」玩法层接进来再换）
const C = require('../config');
const T = require('../text');
const UI = require('../ui');
const Expr = require('../expr');
const STORY = require('../story');

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
