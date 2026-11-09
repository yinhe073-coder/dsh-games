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
