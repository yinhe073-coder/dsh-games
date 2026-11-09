// 引擎：主循环、DPR/cover 适配、输入分发、场景管理
const C = require('./config');
const P = require('./platform');

class Engine {
  constructor() {
    this.W = C.DESIGN_W;
    this.H = C.DESIGN_H;
    this.s = 1;
    this.scale = 1;
    this.scenes = {};
    this.scene = null;
    this.sceneName = null;
    this.touchStart = null;
    this.frameCount = 0;
    this.fpsSamples = [];
  }

  register(name, scene) {
    this.scenes[name] = scene;
  }

  setScene(name, params) {
    const next = this.scenes[name];
    if (!next) throw new Error('scene not found: ' + name);
    if (this.scene && this.scene.exit) this.scene.exit(this);
    this.scene = next;
    this.sceneName = name;
    if (next.enter) next.enter(this, params || {});
  }

  resize() {
    const vp = P.viewport();
    const canvas = P.mainCanvas();
    this.vp = vp;
    this.canvas = canvas;
    canvas.width = Math.round(vp.width * vp.dpr);
    canvas.height = Math.round(vp.height * vp.dpr);
    if (!P.IS_WX) {
      canvas.style.width = vp.width + 'px';
      canvas.style.height = vp.height + 'px';
    }
    this.ctx = canvas.getContext('2d');
    this.s = vp.width / C.DESIGN_W; // 设计单位 -> CSS px
    this.scale = vp.dpr * this.s; // 设计单位 -> 物理 px
    this.H = vp.height / this.s; // 可视高度（1334 ~ 1626）
    // 底部安全线随实际屏幕走：750×1334 时正好 1254，长屏自动下移，不能写死
    this.bottomY = this.H - 80;
    if (this.scene && this.scene.onResize) this.scene.onResize(this);
  }

  toDesign(t) {
    return { x: t.clientX / this.s, y: t.clientY / this.s };
  }

  bindInput() {
    P.onTouch((phase, touches) => {
      if (!touches || !touches.length) return;
      const p = this.toDesign(touches[0]);
      if (phase === 'start') {
        this.touchStart = { x: p.x, y: p.y, t: P.now() };
        if (this.scene && this.scene.onTouchDown)
          this.scene.onTouchDown(p.x, p.y, this);
      } else if (phase === 'end' && this.touchStart) {
        const dur = P.now() - this.touchStart.t;
        const dist = Math.sqrt(
          Math.pow(p.x - this.touchStart.x, 2) +
            Math.pow(p.y - this.touchStart.y, 2)
        );
        if (this.scene && this.scene.onTouchUp) this.scene.onTouchUp(p.x, p.y, this);
        if (dur < 600 && dist < 30 && this.scene && this.scene.onTap)
          this.scene.onTap(p.x, p.y, this);
        this.touchStart = null;
      }
    });
  }

  start() {
    this.resize();
    P.onResize(() => this.resize());
    this.bindInput();
    this.last = P.now();
    const loop = () => {
      const t = P.now();
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.frame(dt);
      P.raf(loop);
    };
    P.raf(loop);
  }

  frame(dt) {
    if (!this.scene) return;
    this.frameCount++;
    if (this.scene.update) this.scene.update(dt, this);
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    this.scene.draw(ctx, this);
    // 调试叠层：?probe=1 时把实测布局数字画在画面上（截图即可取证）
    if (this.overlay) {
      ctx.save();
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const lines = String(this.overlay).split('\n');
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(8, this.H - 12 - lines.length * 24, 640, lines.length * 24 + 8);
      ctx.fillStyle = '#8CF3A6';
      lines.forEach((l, i) => ctx.fillText(l, 14, this.H - 8 - lines.length * 24 + i * 24));
      ctx.restore();
    }
  }
}

module.exports = Engine;
