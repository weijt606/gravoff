# GRAVOFF

[![English](https://img.shields.io/badge/README-English-2f81f7)](README.md)
[![中文](https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-e5534b)](README.zh-CN.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Gravity is optional. Landing isn't.**

A tiny browser game about a sports car with suction fans and cold-gas thrusters: drive upside down, fly over a row of cars, and land on the target. Plain JavaScript + Canvas, no build step, no dependencies.

## Run locally

Requires [Node.js](https://nodejs.org/) 18+ (or Python 3, or just a browser).

```bash
git clone https://github.com/weijt606/gravoff.git
cd gravoff
npm start            # → http://localhost:8080
```

Other ways:

- `python3 -m http.server 8080 -d public`, then open http://localhost:8080
- Or open `public/index.html` directly in your browser

Use another port with `PORT=3000 npm start`. The game runs entirely in your browser; best scores are saved in local storage.

## Modes

| Mode | Goal |
|---|---|
| **Inverted Loop** | Keep the fans above the white line to stick to the loop, drive upside down, fly off the end, flip upright and land on the target |
| **Car Jump** | Take off at the TAKEOFF line (45–60 km/h works best), clear five cars, then use fan suction and brakes to stop on the target before the cliff |

S and SS grades need a midair jet barrel roll (G) plus a perfect landing.

## Controls

| Key | Action |
|---|---|
| → / ← | Accelerate / brake (reverse thrust in the air) |
| ↑ / ↓ | Fan power |
| Space | Thrusters (hold) |
| F / G | Kickflip / jet barrel roll |
| R / P / M | Retry / pause / mute |

Touch screens get on-screen buttons. The interface follows your browser language (English / 中文).

## Project structure

```
public/          the whole game (open index.html)
  js/            physics, rendering, scoring, 8-bit music, i18n
tools/           local server and physics simulators (npm run sim:loop / sim:kick)
```

## License

[MIT](LICENSE). All code, graphics and music are original to this project.

## Disclaimer

- GRAVOFF is an independent, non-commercial fan game. It is not affiliated with, authorised, sponsored or endorsed by any car, aerospace or technology company.
- The vehicles, "suction fans", "cold-gas thrusters" and physics are fictional and simplified. They do not represent any real product. **Do not attempt any driving or flying shown in the game in real life.**
- Result commentary only teases your in-game performance and does not target any real person, company or group.
- The software is provided "as is", without warranty of any kind (see [LICENSE](LICENSE)).
