// P1 启动页：标题 + 《健康游戏忠告》全文 + 轻触开始（合规 3.2.6 第 2 条）
// 布局自适应：短屏/方屏（PC 微信窗口）下先缩标题，再兜底压缩按钮高度，保证不压标题
const C = require('../config');
const T = require('../text');
const UI = require('../ui');

module.exports = {
  enter() {
    this.t = 0;
    this.promptRect = null;
  },
  update(dt) {
    this.t += dt;
  },
  draw(ctx, app) {
    const W = app.W;
    const H = app.H;
    UI.drawBgCover(ctx, app, 'bg_tian_dusk', UI.PALETTE.dusk);

    // 先算底部锚定的忠告面板
    const panelW = W - C.MARGIN * 2;
    const fs = 26;
    const lines = T.wrap(ctx, C.HEALTH_ADVICE, panelW - 48, fs);
    const lh = fs * 1.6;
    const panelH = lines.length * lh + 44;
    const panelY = app.bottomY - panelH;

    // 标题与按钮的自适应几何
    const titleImg = app.assets.img('title_main');
    const topMin = C.SAFE_TOP + 44;
    const titleY = Math.max(topMin, Math.round(H * 0.13));
    const baseTitleW = 460;
    const baseTitleH = titleImg && titleImg.width
      ? (titleImg.height / titleImg.width) * baseTitleW
      : 68 * 1.5 + 40;
    let titleW = baseTitleW;
    let titleH = baseTitleH;

    const bw = Math.min(440, W - C.MARGIN * 2);
    let bh = 88;
    const gapBtn = 64; // 按钮与忠告面板的常规间距
    const minGap = 24; // 标题与按钮的最小间距
    let by = panelY - gapBtn - bh;

    // 标题放不下就按比例缩（最小 30%）；连 60 高度都挤不出来时直接不画标题，
    // 合规区块（忠告 + 适龄）优先可见 —— 极端横向短屏（PC 端窗口被拉扁）走这条
    const maxTitleH = by - minGap - titleY;
    let drawTitle = true;
    if (maxTitleH < 60) {
      drawTitle = false;
      titleH = 0;
    } else if (maxTitleH < titleH) {
      const k = Math.max(0.3, maxTitleH / baseTitleH);
      titleW = Math.max(150, Math.round(baseTitleW * k));
      titleH = titleImg && titleImg.width
        ? (titleImg.height / titleImg.width) * titleW
        : Math.round(baseTitleH * k);
    }
    by = Math.max(by, titleY + titleH + (drawTitle ? minGap : 0));
    // 极端短屏：按钮仍会越界就压按钮高度，绝不允许盖住忠告面板
    if (by + bh > panelY - 8) {
      by = Math.min(by, panelY - 8 - 64);
      bh = Math.max(64, panelY - 8 - by);
    }

    // 画标题（极端短屏会给合规区块让位）
    if (drawTitle) {
      if (titleImg && titleImg.width) {
        ctx.drawImage(titleImg, (W - titleW) / 2, titleY, titleW, titleH);
      } else {
        T.drawLines(ctx, [C.GAME_NAME], W / 2, titleY, {
          size: Math.round(68 * (titleW / baseTitleW)),
          bold: true,
          align: 'center',
          color: '#F7E7C6',
          stroke: '#1B2A41',
          strokeWidth: 7,
          shadow: 'rgba(0,0,0,0.55)',
          shadowBlur: 12
        });
      }
    }

    // 适龄提示 8+（宽度按实测文字算，避免被右边缘切）
    const ageW = Math.ceil(T.measure(ctx, C.AGE_TIP, 24, false)) + 40;
    UI.badge(ctx, W - C.MARGIN - ageW, C.SAFE_TOP, ageW, 54, C.AGE_TIP, {
      size: 24
    });

    // 《健康游戏忠告》全文
    UI.panel(ctx, C.MARGIN, panelY, panelW, panelH, {
      fill: 'rgba(12,16,26,0.88)',
      border: 'rgba(242,181,68,0.35)',
      radius: 16
    });
    T.drawLines(ctx, lines, C.MARGIN + 24, panelY + 22, {
      size: fs,
      color: '#F5EFE3',
      lineHeight: 1.6
    });

    // 轻触开始：暗底胶囊（浅云海上也要读得清）
    const pulse = 0.55 + 0.25 * Math.sin(this.t * 2.2);
    UI.button(ctx, (W - bw) / 2, by, bw, bh, '轻触屏幕，点一盏灯', {
      bg: 'rgba(14,18,30,0.86)',
      border: 'rgba(242,181,68,' + pulse.toFixed(2) + ')',
      color: '#F2B544',
      size: bh < 76 ? 26 : 32,
      shadow: 'rgba(0,0,0,0.45)'
    });
    this.promptRect = { x: (W - bw) / 2, y: by, w: bw, h: bh };
    // 布局自查用（冒烟测试读这里核安全区与重叠）
    this.metrics = {
      panelY: panelY,
      panelH: panelH,
      panelBottom: panelY + panelH,
      promptY: by,
      promptRect: this.promptRect,
      adviceLines: lines.length,
      titleY: titleY,
      titleBottom: titleY + titleH,
      titleHidden: !drawTitle,
      btnBottom: by + bh
    };
  },
  onTap(x, y, app) {
    if (this.promptRect && UI.hit(this.promptRect, x, y)) app.setScene('info');
  }
};
