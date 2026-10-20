# Portfolio

Personal portfolio of Pandora Becker Lovatto, built with React, TypeScript, and Vite.

## Stack

- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [oxlint](https://oxc.rs/) + [Prettier](https://prettier.io/)

## Features

- **Editor-style shell** — activity bar, file tabs and a status bar that follow the scroll; the hero opens as its own source code, compiles, and the name flies into the title.
- **Portuguese and English** — follows the browser language, with a PT / EN switch at the top right that is remembered (`i18next`).
- **Light/dark theme** — toggled from the activity bar with a circular wipe (View Transitions), persisted in `localStorage` with a fallback to the system preference (`prefers-color-scheme`).
- **Sections** — copper nameplate wired into the board (with the electrified "tt" mark), interactive terminal, projects with an x-ray lens over the screenshot, a pinned exploded-chip stack, the career as a git commit graph, a contact form that previews the request it sends (delivered by a Cloudflare Worker with Turnstile), and a résumé download in the status bar. Each commit opens a `git show` window with a diff of that period, each project can run live inside a browser-style window, and the tab title turns into "● unsaved changes" while the page is in the background.
- **Circuit board background** — the page is rendered as a procedurally routed PCB (45° traces, vias, buses, ICs, passives, silkscreen) that scrolls with the content. Content marked `data-chip` is mounted as a chip with pins wired into the board; `data-quiet` blocks keep clean substrate behind text.
  - Power-on reveal from the hero chip, a spine bus that carries "current" down the page as you scroll and powers each chip (its LED lights up).
  - Signals roam the trace graph; the cursor lights the copper and sparks pulses, clicks send a wave that branches at every junction, hovering a card pulls current into its pins.
  - Scrolling never measures the layout: the scroll position comes from the scroll event, the scrollspy uses an IntersectionObserver, and pinned sections are measured only when the layout changes.
  - If frames stay slow, the board switches to a low-power mode (1x resolution, half the pulses) so the page keeps scrolling smoothly.
  - A slower, fainter inner layer with mouse parallax adds depth. With `prefers-reduced-motion` the board is drawn static and only redraws on scroll or pointer input.
  - `data-bare` chips draw their own light and receive the current as `board:current` events; a `data-board-pin` section freezes the board while its sticky child is pinned.

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Command                | Description                           |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Starts the development server         |
| `npm run build`        | Type-checks and builds for production |
| `npm run preview`      | Serves the production build locally   |
| `npm run lint`         | Runs oxlint                           |
| `npm run typecheck`    | Type-checks the project               |
| `npm test`             | Runs the unit tests                   |
| `npm run format`       | Formats the code with Prettier        |
| `npm run format:check` | Checks formatting (used in CI)        |

## Project structure

```
src/
├─ components/
│  ├─ CircuitBackground/   # canvas board engine (routing, pulses, pinned sections, bare chips)
│  ├─ layout/              # editor chrome: activity bar, tabs, status bar, footer
│  ├─ sections/            # Hero, Projects, Stack, Experience, Contact (component + styles each)
│  └─ ui/                  # Chip, Icon, SectionHead, SectionDivider
├─ constants/              # non-translatable data: profile, projects, stack, experience, navigation
├─ context/                # theme context (Theme, ThemeProvider)
├─ hooks/                  # useTheme, useReveal, useActiveSection, useReducedMotion
├─ lib/                    # contact, turnstile, introLock, languageTransition, scramble, typewriter, tween, svg, viewTransition
├─ locales/                # pt and en translations (every on-screen string)
├─ styles/index.css        # tokens, base, chip, buttons, entrance motion
├─ i18n.ts                 # language detection (saved choice, then the browser)
├─ App.tsx
└─ main.tsx
public/                    # favicon, touch icon, résumé PDF, project images (WebP), social preview, sitemap, 404
worker/                    # Cloudflare Worker that sends the contact e-mail (see worker/README.md)
```

## Environment

Copy `.env.example` to `.env.local` and set `VITE_CONTACT_ENDPOINT` (the contact Worker URL) and `VITE_TURNSTILE_SITE_KEY` (the public Turnstile key; the example value is Cloudflare's test key, which always passes). Without an endpoint the form still validates, and sending shows an error.

## Deploy

The site is published to GitHub Pages at `https://plovatto.github.io/portifolio/` (production builds use the `/portifolio/` base; override it with `VITE_BASE`). Fonts and project images are self-hosted, so the page makes no third-party requests until the contact form is used.

| Workflow            | Runs on                               | Does                                                                           |
| ------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| `ci.yml`            | pull requests and pushes to `main`    | format check, lint, typecheck and build for the site; typecheck for the worker |
| `tests.yml`         | pull requests and pushes to `main`    | unit tests for the site and the worker                                         |
| `deploy-site.yml`   | pushes to `main` (outside `worker/`)  | lint, tests, build and deploy to GitHub Pages                                  |
| `deploy-worker.yml` | pushes to `main` that touch `worker/` | typecheck, tests and `wrangler deploy`                                         |

One-time setup in the GitHub repository:

1. **Settings → Pages → Source:** GitHub Actions.
2. **Settings → Secrets and variables → Actions → Variables:** `VITE_CONTACT_ENDPOINT` (the Worker URL) and `VITE_TURNSTILE_SITE_KEY` (the public site key). Both end up in the public bundle, so they are variables, not secrets.
3. **Secrets:** `CLOUDFLARE_API_TOKEN` (template "Edit Cloudflare Workers") and `CLOUDFLARE_ACCOUNT_ID`, used only by the worker deploy. The worker's own secrets (`CONTACT_TO`, `RESEND_API_KEY`, `TURNSTILE_SECRET`) stay in Cloudflare and are never in the repository.
4. **Cloudflare Turnstile:** add `plovatto.github.io` to the widget's hostnames. The worker already allows that origin in `worker/wrangler.toml`.
