# 游戏墙源包（dsh-game-studio 在线游戏源）

本目录是一个可直接作为 **DSH 游戏工坊「在线游戏源」** 托管的内容包：一个 `games.json`（feed）+ 每个游戏一个子目录。
游戏工坊的墙只接受 **https://** 源，并且游戏 URL / 封面必须与 feed **同源**（见 `dsh-game-studio` 的 `parseGamesFeed` 规则），所以需要把整个目录原样放到一个 https 静态站点（最省事的是 GitHub Pages）。

## 内容

| slug | 标题 | 入口 | 形态 | 大小 |
|---|---|---|---|---|
| `half-sugar-chapter1` | 半糖心动 · 第一章 迟到的新人 | `half-sugar-chapter1/index.html` | RenPy web（竖屏自适应重建版 0.2.0-portrait-r1） | 80.7 MB / 49 件 |
| `ninefold-noodle` | 九重云外小面馆 | `ninefold-noodle/debug.html` | 微信小游戏工程的浏览器调试台 | 4.47 MB / 65 件 |
| `smoke-check` | 接入自检（工坊模板） | `smoke-check/index.html` | 工坊模板游戏，单文件 HTML 导出 | 46 KB / 1 件 |

封面：`covers/*.jpg`（390 宽，取自本目录 `.verify/` 的真实首屏截图）。

## 已验证（本机，2026-11-10）

`node verify-games.mjs` 起本地静态服务，用 Chrome 无头 390×844 逐个打开：

| 游戏 | 标题回读 | 画布 | 页面错误 | 失败请求 |
|---|---|---|---|---|
| 半糖心动第一章 | 半糖心动 | 780×1688 | 0 | 0 |
| 九重云外小面馆 | 九重云外小面馆 · 浏览器调试台 | 780×1688 | 0 | 0 |
| 接入自检 | 接入自检 | 780×1688 | 0 | 0 |

截图在 `.verify/*.png`，原始判定在 `.verify/verify.json`（`allOk: true`）。

## 上线到 GitHub Pages

前置：本机装 `gh` 并 `gh auth login`（未安装/未登录时不要自动装，属于本人授权动作）。

```powershell
cd C:\deepseek-harness\.dsh\bot\workspace\games-wall
gh repo create <你的账号>/dsh-games --public --source . --remote origin --push
# 打开 Pages：Settings → Pages → Source: Deploy from a branch → main / root
```

上线后源地址就是 `https://<你的账号>.github.io/dsh-games/`，feed 地址 `https://<你的账号>.github.io/dsh-games/games.json`。

## 在游戏工坊里订阅

1. 刷新 3081 页面（客户端面板刷新后加载）。
2. 右栏 **+ → 游戏工坊 · 游戏墙** → 订阅在线游戏源，填 `你的账号/dsh-games`（或完整 `https://你的账号.github.io/dsh-games/`）。
3. 墙里会列出上面 3 个游戏，点一下直接玩（不经过 agent，不花 token）。

## 注意

- 半糖这一份是**竖屏自适应版**（720×1280 舞台，正文约 21.7 CSS px）；与公开站 revision2 是同源同版内容的重建版本，不是重发布，公开站未改动。
- 九重用的是工程的浏览器调试台（`debug.html`），不是微信真机包；真机/审核仍按原项目口径另验。
- 本包不上传任何凭据；`.verify/` 可删，不影响上墙。
- 回滚：公开仓删除即下线；本地删掉本目录即回到只有工坊内建游戏的状态。
