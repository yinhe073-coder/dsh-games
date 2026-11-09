// UI 绘制工具：全部走 Canvas 2D，无外部资源依赖
const C = require('./config');
const T = require('./text');

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
