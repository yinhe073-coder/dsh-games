// 闪回播放层：分包静帧序列 + 推拉 + 溶解；分包失败降级为字幕 + 底色（不黑屏）
const C = require('../config');
const T = require('../text');
const UI = require('../ui');

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
