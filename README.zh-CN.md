# GRAVOFF

[![English](https://img.shields.io/badge/README-English-2f81f7)](README.md)
[![中文](https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-e5534b)](README.zh-CN.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**重力可选，落地必修。**（Gravity is optional. Landing isn't.）

一个小小的浏览器游戏：一辆装了吸附风扇和冷气推进器的跑车，倒挂行驶、飞越车阵、精准落在目标点上。纯 JavaScript + Canvas，不需要构建，没有任何依赖。

## 本地运行

需要 [Node.js](https://nodejs.org/) 18+（或者 Python 3，或者只用浏览器）。

```bash
git clone https://github.com/weijt606/gravoff.git
cd gravoff
npm start            # → http://localhost:8080
```

其他方式：

- `python3 -m http.server 8080 -d public`，然后打开 http://localhost:8080
- 或者直接用浏览器打开 `public/index.html`

换端口：`PORT=3000 npm start`。游戏完全在浏览器里运行，最佳成绩保存在本机。

## 模式

| 模式 | 目标 |
|---|---|
| **倒立半环** | 风扇保持在白线以上吸住半环，倒挂行驶后飞出尽头，翻正并降落在目标点 |
| **飞越车阵** | 在 TAKEOFF 线起飞（45–60 km/h 最合适），越过 5 辆车，用风扇吸附和刹车在悬崖前停在目标点 |

S 和 SS 评级需要空中喷气侧滚（G）+ 完美着陆。

## 操作

| 按键 | 作用 |
|---|---|
| → / ← | 加速 / 刹车（空中为反推） |
| ↑ / ↓ | 风扇功率 |
| 空格 | 推进器（按住） |
| F / G | Kickflip / 喷气侧滚 |
| R / P / M | 重来 / 暂停 / 静音 |

触屏设备会显示屏幕按钮。界面语言跟随浏览器（English / 中文）。

## 项目结构

```
public/          整个游戏（打开 index.html 即可）
  js/            物理、渲染、计分、8-bit 音乐、多语言
tools/           本地启动脚本和物理模拟器（npm run sim:loop / sim:kick）
```

## 许可证

[MIT](LICENSE)。所有代码、图形和音乐均为本项目原创。

## 免责声明

- GRAVOFF 是独立开发的非商业同人游戏，与任何汽车、航天或科技公司均无关联，未获得其授权、赞助或认可。
- 游戏中的车辆、"吸附风扇""冷气推进器"和物理效果均为虚构和简化，不代表任何真实产品。**请勿在现实中模仿游戏中的任何驾驶或飞行行为。**
- 结算点评只是对游戏表现的调侃，不针对任何真实人物、公司或群体。
- 本软件按"现状"提供，不提供任何形式的担保（见 [LICENSE](LICENSE)）。
