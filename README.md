# Portfolio

Personal portfolio site, work in progress, built with React, TypeScript, and Vite.

## Stack

- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [oxlint](https://oxc.rs/) + [Prettier](https://prettier.io/)

## Features

- **Light/dark theme** — toggled from the button in the top-right corner, persisted in `localStorage` with a fallback to the system preference (`prefers-color-scheme`).
- **Animated circuit background** — PCB-style traces procedurally generated on a `<canvas>`, with light pulses traveling along the paths, hover/click reactivity, and a subtle parallax effect.

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Command             | Description                             |
| -------------------- | ---------------------------------------- |
| `npm run dev`         | Starts the development server            |
| `npm run build`       | Type-checks and builds for production    |
| `npm run preview`     | Serves the production build locally      |
| `npm run lint`        | Runs oxlint                              |
| `npm run format`      | Formats the code with Prettier           |

## Project structure

```
src/
├─ components/
│  ├─ CircuitBackground/   # animated canvas background (engine, trace generator, config)
│  └─ ThemeToggle/         # theme toggle button
├─ context/                # theme context (Theme, ThemeProvider)
├─ hooks/                  # shared hooks (useTheme)
├─ index.css               # global styles + Tailwind theme tokens
├─ App.tsx
└─ main.tsx
```
