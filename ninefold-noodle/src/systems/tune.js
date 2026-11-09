// 调试调参：只在浏览器调试页用 ?tune=fire:1.2,prep:0.8,price:1.5,burn:96
// 正式包（wx 环境没有 window）自动回落默认值，等同于忽略
const DEFAULTS = { fire: 1, prep: 1, price: 1, burn: 92 };

function parse(str) {
  const o = Object.assign({}, DEFAULTS);
  if (!str) return o;
  str.split(',').forEach(function (p) {
    const i = p.indexOf(':');
    if (i <= 0) return;
    const k = p.slice(0, i).trim();
    const v = parseFloat(p.slice(i + 1));
    if (Object.prototype.hasOwnProperty.call(o, k) && isFinite(v)) o[k] = v;
  });
  return o;
}

function fromUrl() {
  try {
    if (typeof window === 'undefined' || !window.location) return Object.assign({}, DEFAULTS);
    const m = /(?:^|[?&])tune=([^&]*)/.exec(window.location.search || '');
    return m ? parse(decodeURIComponent(m[1])) : Object.assign({}, DEFAULTS);
  } catch (e) {
    return Object.assign({}, DEFAULTS);
  }
}

const T = fromUrl();
T.active = ['fire', 'prep', 'price', 'burn'].some(function (k) {
  return T[k] !== DEFAULTS[k];
});

module.exports = { T: T, DEFAULTS: DEFAULTS, parse: parse, fromUrl: fromUrl };
