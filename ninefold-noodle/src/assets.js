// 资源加载器：只认 manifest 的 key，不猜文件名（契约 §三）
// 主包图直连，分包（闪回静帧）按需加载、失败降级
const P = require('./platform');
const manifest = require('../assets/assets-manifest');

function allAssets() {
  const list = ((manifest && manifest.assets) || []).slice();
  return list;
}

class Assets {
  constructor() {
    this.images = {};
    this.segments = {};
    this.total = 0;
    this.loaded = 0;
    this.failed = [];
  }

  load(onProgress, onDone) {
    const list = allAssets();
    this.total = list.length;
    if (!list.length) {
      if (onDone) onDone(0, 0);
      return;
    }
    list.forEach((item) => {
      const img = P.createImage();
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        this.loaded++;
        if (ok) this.images[item.key] = img;
        else this.failed.push(item.key);
        if (onProgress) onProgress(this.loaded, this.total);
        if (this.loaded === this.total && onDone) onDone(this.loaded, this.failed.length);
      };
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = item.path;
    });
  }

  img(key) {
    return this.images[key] || null;
  }

  // 图集切帧（契约 §3.2 frames）
  frames(key) {
    for (let i = 0; i < allAssets().length; i++) {
      if (allAssets()[i].key === key) return allAssets()[i].frames || null;
    }
    return null;
  }

  // 按帧名取单格坐标
  frameOf(atlasKey, frameKey) {
    const list = this.frames(atlasKey) || [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].key === frameKey) return list[i];
    }
    return null;
  }

  // 分包：段定义 + 按需加载
  segment(key) {
    const list = (manifest && manifest.subpackages) || [];
    for (let i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }

  segmentPaths(key) {
    const seg = this.segment(key);
    return seg ? seg.assets.map((a) => a.path) : [];
  }

  // 分包包名 = dir 最后一段（game.json 里声明的 root 目录名），name 只是展示名
  pkgName(seg) {
    if (seg.pkg) return seg.pkg;
    const parts = (seg.dir || '').split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : seg.key;
  }

  // 加载某段闪回：分包成功且图全到位才算成功，否则 onDone(null) 降级
  loadSegment(key, onDone) {
    if (this.segments[key]) return onDone && onDone(this.segments[key]);
    const seg = this.segment(key);
    if (!seg) return onDone && onDone(null);
    const paths = seg.assets.map((a) => a.path);
    const start = () => {
      const imgs = [];
      let n = 0;
      let dead = false;
      paths.forEach((p) => {
        const im = P.createImage();
        im.onload = () => {
          if (dead) return;
          imgs.push(im);
          if (++n === paths.length) {
            this.segments[key] = imgs;
            onDone && onDone(imgs);
          }
        };
        im.onerror = () => {
          if (dead) return;
          dead = true;
          onDone && onDone(null);
        };
        im.src = p;
      });
    };
    P.loadSubpackage(this.pkgName(seg), start, () => onDone && onDone(null));
  }
}

module.exports = Assets;
