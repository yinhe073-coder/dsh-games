// 备料案板：5×5 三消引擎（棋盘生成、匹配、消除、掉落、连击）
// 数值口径来自《五机制咬合设计》2.4：3 连 = 上菜进度 +1；火候 每秒 +1.6、每次三消 −3、连击每 +1 额外 −0.4、满 100 糊锅
const KINDS = ['noodle', 'soup', 'scallion', 'egg', 'greens'];

const HEAT_PER_SEC = 1.6;
const HEAT_PER_MATCH = 3;
const HEAT_PER_COMBO = 0.4;
const HEAT_MAX = 100;
const PROGRESS_PER_MATCH = 1;
const TARGET_PER_GUEST = 5;

function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

class Board {
  constructor(seed) {
    this.cols = 5;
    this.rows = 5;
    this.rng = makeRng(seed || Date.now() % 100000);
    this.grid = [];
    this.combo = 0;
    this.progress = 0;
    this.heat = 0;
    this.over = false;
    this.lastGain = 0;
    this.reset();
  }

  reset() {
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
      const row = [];
      for (let x = 0; x < this.cols; x++) row.push(this.randKind());
      this.grid.push(row);
    }
    // 起始盘面不允许已有三连
    let guard = 0;
    while (this.findMatches().cells.length && guard++ < 200) {
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) this.grid[y][x] = this.randKind();
      }
    }
    this.combo = 0;
    this.progress = 0;
    this.heat = 0;
    this.over = false;
  }

  randKind() {
    return KINDS[Math.floor(this.rng() * KINDS.length)];
  }

  at(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
    return this.grid[y][x];
  }

  setGrid(rows) {
    this.grid = rows.map(function (r) { return r.slice(); });
  }

  // 找出所有 ≥3 的横竖连；返回 {cells:[[x,y]...], runs:[{len, dir}]}
  findMatches() {
    const mark = {};
    const runs = [];
    // 横
    for (let y = 0; y < this.rows; y++) {
      let start = 0;
      for (let x = 1; x <= this.cols; x++) {
        const same = x < this.cols && this.grid[y][x] === this.grid[y][start];
        if (!same) {
          const len = x - start;
          if (len >= 3) {
            runs.push({ len: len, dir: 'h' });
            for (let k = start; k < x; k++) mark[y * this.cols + k] = true;
          }
          start = x;
        }
      }
    }
    // 竖
    for (let x = 0; x < this.cols; x++) {
      let start = 0;
      for (let y = 1; y <= this.rows; y++) {
        const same = y < this.rows && this.grid[y][x] === this.grid[start][x];
        if (!same) {
          const len = y - start;
          if (len >= 3) {
            runs.push({ len: len, dir: 'v' });
            for (let k = start; k < y; k++) mark[k * this.cols + x] = true;
          }
          start = y;
        }
      }
    }
    const cols = this.cols;
    const cells = Object.keys(mark).map(function (k) {
      return [k % cols, Math.floor(k / cols)];
    });
    return { cells: cells, runs: runs };
  }

  // 消除 + 掉落 + 补新，返回消除格数
  collapse(cells) {
    cells.forEach((c) => {
      this.grid[c[1]][c[0]] = null;
    });
    for (let x = 0; x < this.cols; x++) {
      let write = this.rows - 1;
      for (let y = this.rows - 1; y >= 0; y--) {
        if (this.grid[y][x] !== null) {
          this.grid[write][x] = this.grid[y][x];
          if (write !== y) this.grid[y][x] = null;
          write--;
        }
      }
      for (let y = write; y >= 0; y--) this.grid[y][x] = this.randKind();
    }
    return cells.length;
  }

  // 连锁结算：一次操作触发的全部消除
  resolve() {
    let cleared = 0;
    let steps = 0;
    this.combo = 0;
    for (;;) {
      const m = this.findMatches();
      if (!m.cells.length) break;
      steps++;
      this.combo = steps;
      cleared += this.collapse(m.cells);
      this.progress += PROGRESS_PER_MATCH;
      const drop = HEAT_PER_MATCH + HEAT_PER_COMBO * (this.combo - 1);
      this.heat = Math.max(0, this.heat - drop);
    }
    this.lastGain = this.progress * 12;
    if (this.heat >= HEAT_MAX) this.over = true;
    return { cleared: cleared, combo: this.combo, progress: this.progress };
  }

  // 尝试交换；不成三连则换回
  trySwap(ax, ay, bx, by) {
    if (this.over) return { ok: false, msg: '糊锅了' };
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    if (dx + dy !== 1) return { ok: false, msg: '只能换相邻两格' };
    const a = this.at(ax, ay);
    const b = this.at(bx, by);
    this.grid[ay][ax] = b;
    this.grid[by][bx] = a;
    if (!this.findMatches().cells.length) {
      this.grid[ay][ax] = a;
      this.grid[by][bx] = b;
      return { ok: false, msg: '换不成一道工序' };
    }
    const r = this.resolve();
    return { ok: true, cleared: r.cleared, combo: r.combo, progress: r.progress };
  }

  // 全局压力：火候随时间涨，满 100 糊锅（本夜结束，不删档）
  updateHeat(dt) {
    if (this.over) return;
    this.heat = Math.min(HEAT_MAX, this.heat + HEAT_PER_SEC * dt);
    if (this.heat >= HEAT_MAX) this.over = true;
  }

  guestsServed() {
    return Math.floor(this.progress / TARGET_PER_GUEST);
  }
  progressToGuest() {
    return this.progress % TARGET_PER_GUEST;
  }
}

module.exports = {
  Board: Board,
  KINDS: KINDS,
  TARGET_PER_GUEST: TARGET_PER_GUEST,
  HEAT_MAX: HEAT_MAX,
  HEAT_PER_SEC: HEAT_PER_SEC
};
