# Tangent Plane Lab — Standalone Version

This is a fully standalone React/Vite project. It does **not** require OpenAI Sites, OpenAI hosting, Cloudflare, Wrangler, authentication, environment variables, or an API key.

**Try it online:** https://mohammed-gamal.github.io/tangent-plane/

## Requirements

- Node.js 22.12 or newer
- npm, which is included with Node.js

Check your versions:

```bash
node --version
npm --version
```

## Run locally

Extract the ZIP, open a terminal inside the extracted `tangent-plane-lab-standalone` folder, and run:

```bash
npm install
npm run dev
```

Open the address shown in the terminal, normally:

```text
http://localhost:5173
```

Stop the server with `Ctrl+C`.

## Create a production build

```bash
npm run build
npm run preview
```

The optimized website is generated in the `dist` folder.

## Features

- Interactive 3D surface visualization
- Tangent plane at an editable point
- Five default example functions
- Custom functions using `x` and `y`
- Live partial derivatives and gradient
- Optional partial-derivative tangent directions
- Optional normal vector
- Mouse/touch rotation and scroll zooming

## Supported function syntax

Examples:

```text
x^2 + y^2
x^2 - y^2
sin(x) * cos(y)
exp(-(x^2 + y^2))
sin(x^2 + y^2) / 2
```

Supported names include `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `sqrt`, `abs`, `exp`, `log`, `min`, `max`, `pow`, `floor`, `ceil`, `round`, `pi`, and `e`.

## Main files

- `src/App.tsx` — interface, functions, point controls, and calculations
- `src/surface-canvas.tsx` — custom 3D renderer and vector overlays
- `src/index.css` — visual theme and global styling
- `src/components/ui/switch.tsx` — display switches
- `src/main.tsx` — application entry point

## Mathematics

At `P = (x0, y0, f(x0,y0))`, the tangent plane is

```text
z = f(x0,y0) + fx(x0,y0)(x - x0) + fy(x0,y0)(y - y0)
```

The displayed tangent directions and normal vector are

```text
tx = <1, 0, fx>
ty = <0, 1, fy>
n  = tx × ty = <-fx, -fy, 1>
```
