# 🐤 Flappy Bird — Neon Wings Edition

A stylish **Flappy Bird** clone built with **Vanilla JavaScript** and the **HTML5 Canvas API** — featuring a neon cyberpunk aesthetic, procedural audio, dynamic difficulty, particle effects, and a medal system.

---

## ✨ Features

- 🎮 **Classic Flappy Bird gameplay** — tap/click/spacebar to flap
- 🌆 **Neon Cyberpunk theme** — animated aurora bands, parallax cityscape, glowing pipes
- 🔊 **Procedural Audio** — sound effects generated via Web Audio API (no sound files needed!)
  - Flap, score, hit, and death sounds
- 📈 **Dynamic Difficulty** — pipe gap shrinks and speed increases as your score climbs
- 💥 **Particle Effects** — flap particles, neon explosion on death, score trail
- ⭐ **+1 Floating Text** — score popups on each pipe cleared
- 📳 **Screen Shake & Flash** — on collision impact
- 🏅 **Medal System** — Bronze (5+), Silver (10+), Gold (20+), Platinum (40+)
- 💾 **High Score** — persisted in localStorage
- 🏆 **NEW BEST badge** — shown when you beat your personal best
- 📱 **Touch + Keyboard support** — Space, Arrow Up, mouse click, or touch

---

## 🗂️ Project Structure

```
flappy-bird-game/
├── index.html          # Game shell with start & game-over screens
├── main.js             # Full game engine (physics, render, audio, input)
├── style.css           # Neon UI styling (glassmorphism, animations)
└── package.json
```

---

## 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| Vanilla JavaScript | Game engine, all logic |
| HTML5 Canvas API | Rendering |
| Web Audio API | Procedural sound effects |
| Vite | Dev server & bundler |
| CSS3 | Glassmorphism UI panels |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v16+

### Installation & Run

```bash
git clone https://github.com/ojasvcode/flappy-bird-game.git
cd flappy-bird-game
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🎮 Controls

| Input | Action |
|---|---|
| `Space` / `↑` Arrow | Flap |
| Mouse Click | Flap |
| Touch (mobile) | Flap |

---

## 🏅 Medal Thresholds

| Medal | Score Required |
|---|---|
| 🥉 Bronze | 5+ |
| 🥈 Silver | 10+ |
| 🥇 Gold | 20+ |
| 💎 Platinum | 40+ |

---

## 📄 License

This project is for educational purposes only and is not affiliated with Dong Nguyen or .GEARS Studios.

---

<div align="center">Made with ❤️ by <a href="https://github.com/ojasvcode">ojasvcode</a></div>
