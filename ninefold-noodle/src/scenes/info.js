// P2 信息页：必须在《健康游戏忠告》之后、游戏开始之前（合规 3.2.6 第 1 条）
// 字段口径按铺货席 2026-11-08 定稿：无版号 → 版号三项标「暂无」，绝不编号
const C = require('../config');
const T = require('../text');
const UI = require('../ui');

module.exports = {
  enter() {
    this.t = 0;
    this.rect = null;
  },
  update(dt) {
    this.t += dt;
  },
  draw(ctx, app) {
    const W = app.W;
    const H = app.H;
    UI.drawBgCover(ctx, app, 'bg_tian_dusk', UI.PALETTE.dusk);
    ctx.fillStyle = 'rgba(8,10,18,0.72)';
    ctx.fillRect(0, 0, W, H);

    const pw = W - C.MARGIN * 2;
    const rows = [
      '游戏名称：' + C.GAME_NAME,
      '著作权人：' + C.INFO.author,
      '出版服务单位、批准文号、出版物号：' + C.INFO.publish,
      '备案号：' + C.INFO.record,
      '版本：' + C.INFO.version,
      '适龄提示：8+',
      '《健康游戏忠告》已在启动页全文登载',
      C.INFO.note
    ];

    const fs = 26;
    const textW = pw - 48;
    let lines = [];
    rows.forEach((row) => {
      const ws = T.wrap(ctx, row, textW, fs);
      lines = lines.concat(ws);
      lines.push(''); // 行间留空
    });
    if (lines.length && lines[lines.length - 1] === '') lines.pop();

    const lh = fs * 1.55;
    const headH = 120;
    const panelH = lines.length * lh + 56;
    const btnH = 96;
    const btnY = app.bottomY - btnH;
    let panelY = (H - panelH) / 2;
    const maxPanelBottom = btnY - 56;
    if (panelY + panelH > maxPanelBottom) panelY = maxPanelBottom - panelH;

    T.drawLines(ctx, ['关于本游戏'], W / 2, C.SAFE_TOP, {
      size: 40,
      bold: true,
      align: 'center',
      color: '#F7E7C6',
      stroke: 'rgba(10,12,20,0.8)',
      strokeWidth: 4
    });

    UI.panel(ctx, C.MARGIN, panelY, pw, panelH, {
      fill: 'rgba(12,16,26,0.9)',
      border: 'rgba(242,181,68,0.32)',
      radius: 18
    });
    T.drawLines(ctx, lines, C.MARGIN + 24, panelY + 28, {
      size: fs,
      color: '#EFE7D8',
      lineHeight: 1.55
    });

    const bw = 420;
    this.rect = UI.button(ctx, (W - bw) / 2, btnY, bw, btnH, '进入面馆', {
      bg: 'rgba(242,181,68,0.94)',
      color: '#1B2A41',
      size: 34,
      shadow: 'rgba(0,0,0,0.4)'
    });
    this.metrics = {
      panelY: panelY,
      panelH: panelH,
      panelBottom: panelY + panelH,
      btnY: btnY,
      rows: lines.length
    };
  },
  onTap(x, y, app) {
    if (this.rect && UI.hit(this.rect, x, y)) app.setScene('market');
  }
};
