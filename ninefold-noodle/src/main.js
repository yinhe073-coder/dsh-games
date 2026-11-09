// 启动装配：注册场景、加载资源、进入启动页（合规顺序：启动页 → 信息页 → 游戏）
const Engine = require('./engine');
const Assets = require('./assets');
const Splash = require('./scenes/splash');
const Info = require('./scenes/info');
const Play = require('./scenes/play');
const Flash = require('./scenes/flash');
const Ending = require('./scenes/ending');
const Market = require('./scenes/market');
const Night = require('./scenes/night');
const BoardScene = require('./scenes/board');

const app = new Engine();
app.assets = new Assets();

app.register('splash', Splash);
app.register('info', Info);
app.register('market', Market);
app.register('night', Night);
app.register('board', BoardScene);
app.register('play', Play);
app.register('flash', Flash);
app.register('ending', Ending);

app.setScene('splash');
app.start();

// 资源后台加载，不阻塞首帧；缺图时场景自动走渐变兜底
app.assets.load(
  null,
  function (loaded, failed) {
    if (failed) console.warn('[assets] 加载失败 ' + failed + ' 个');
  }
);

// 调试台用：?scene=play / ?scene=flash&seg=flash_02 直接进指定场景（仅浏览器环境生效）
const P = require('./platform');
if (!P.IS_WX && typeof window !== 'undefined' && window.location && window.location.search) {
  const kv = {};
  window.location.search
    .replace(/^\?/, '')
    .split('&')
    .forEach(function (p) {
      const i = p.indexOf('=');
      if (i > 0) kv[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1));
    });
  if (kv.scene) {
    // 调试直达夜局时先把一局跑起来，否则没有客单可画
    if (kv.scene === 'night') {
      const G = require('./systems/game');
      G.load();
      G.startNight();
      if (kv.phase === 'summary') {
        G.chooseCard(G.N.offers[0].id);
        G.N.total = 5;
        G.N.coins = 87;
        G.N.incense = 5;
        G.N.phase = 'summary';
      } else if (kv.phase !== 'pick') {
        G.chooseCard(G.N.offers[0].id);
      }
    }
    app.setScene(kv.scene, kv.seg ? { seg: kv.seg, next: 'play' } : {});
  }
  // ?probe=1：把实际量到的布局数字直接画在画面上，无头截图即可取证
  if (kv.probe) {
    const tick = function () {
      const m = (app.scene && app.scene.metrics) || {};
      app.overlay =
        'vw=' + app.vp.width + ' vh=' + app.vp.height + ' dpr=' + app.vp.dpr +
        ' realDpr=' + window.devicePixelRatio + ' s=' + app.s.toFixed(4) +
        '\nW=' + app.W + ' H=' + app.H.toFixed(1) + ' bottomY=' + app.bottomY.toFixed(1) +
        ' scene=' + app.sceneName +
        '\nmetrics=' + JSON.stringify(m);
    };
    tick();
    setInterval(tick, 200);
  }
}

module.exports = app;
