// 结局页：四段收束 + 重玩
const C = require('../config');
const T = require('../text');
const UI = require('../ui');
const STORY = require('../story');

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
