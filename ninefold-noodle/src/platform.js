// 平台适配层：把 wx API 收在这一层，核心逻辑不直接碰 wx（契约 §一 入口形态）
const IS_WX =
  typeof wx !== 'undefined' && typeof wx.createCanvas === 'function';

let _canvas = null;

function mainCanvas() {
  if (_canvas) return _canvas;
  if (IS_WX) {
    _canvas =
      (typeof globalThis.canvas !== 'undefined' && globalThis.canvas) ||
      wx.createCanvas();
  } else {
    _canvas = document.getElementById('game');
  }
  return _canvas;
}

function viewport() {
  if (IS_WX) {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const safe = info.safeArea;
    const bottomInset = safe ? Math.max(0, info.screenHeight - safe.bottom) : 0;
    return {
      width: info.windowWidth,
      height: info.windowHeight,
      dpr: Math.min(info.pixelRatio || 2, 3),
      safeTop: safe ? safe.top : 0,
      safeBottom: bottomInset
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, 3),
    safeTop: 0,
    safeBottom: 0
  };
}

function createImage() {
  return IS_WX ? wx.createImage() : new Image();
}

function raf(cb) {
  return requestAnimationFrame(cb);
}

function now() {
  return Date.now();
}

function onResize(cb) {
  if (IS_WX) {
    if (wx.onWindowResize) wx.onWindowResize(cb);
  } else {
    window.addEventListener('resize', cb);
  }
}

function onTouch(cb) {
  if (IS_WX) {
    wx.onTouchStart((e) => cb('start', e.touches));
    wx.onTouchMove((e) => cb('move', e.touches));
    wx.onTouchEnd((e) => cb('end', e.changedTouches));
    wx.onTouchCancel((e) => cb('cancel', e.changedTouches));
    return;
  }
  const el = mainCanvas();
  const norm = (list) =>
    Array.prototype.map.call(list, (t) => ({
      clientX: t.clientX,
      clientY: t.clientY,
      identifier: t.identifier
    }));
  el.addEventListener('touchstart', (e) => {
    e.preventDefault();
    cb('start', norm(e.touches));
  });
  el.addEventListener('touchmove', (e) => {
    e.preventDefault();
    cb('move', norm(e.touches));
  });
  el.addEventListener('touchend', (e) => {
    e.preventDefault();
    cb('end', norm(e.changedTouches));
  });
  el.addEventListener('mousedown', (e) =>
    cb('start', [{ clientX: e.clientX, clientY: e.clientY, identifier: 0 }])
  );
  el.addEventListener('mouseup', (e) =>
    cb('end', [{ clientX: e.clientX, clientY: e.clientY, identifier: 0 }])
  );
}

function getStorage(key, def) {
  try {
    if (IS_WX) {
      const v = wx.getStorageSync(key);
      return v === '' || v === undefined ? def : v;
    }
    const raw = window.localStorage.getItem(key);
    return raw === null ? def : JSON.parse(raw);
  } catch (e) {
    return def;
  }
}

function setStorage(key, val) {
  try {
    if (IS_WX) wx.setStorageSync(key, val);
    else window.localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    /* 存档失败不阻塞游戏 */
  }
}

// 分包加载：失败降级（契约 §五）
function loadSubpackage(name, ok, fail) {
  if (!IS_WX || !wx.loadSubpackage) return ok && ok();
  const task = wx.loadSubpackage({
    name,
    success: () => ok && ok(),
    fail: () => fail && fail()
  });
  return task;
}

module.exports = {
  IS_WX,
  mainCanvas,
  viewport,
  createImage,
  raf,
  now,
  onResize,
  onTouch,
  getStorage,
  setStorage,
  loadSubpackage
};
