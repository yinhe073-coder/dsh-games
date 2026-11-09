// 系统字体渲染：不打包任何字体文件（契约 §一）
// 三端中文字宽差异 5~10%，所以一律 measureText 动态排版，禁止写死宽度
const C = require('./config');

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
