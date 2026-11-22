# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-22

First versioned release of the portfolio.

### Added

- Editor-style shell with an activity bar, file tabs, and a status bar that follow the scroll, plus a tab title that marks unsaved changes while you are away.
- Circuit board background routed at runtime, with roaming pulses, click waves, pinned sections, and cards that power on as you scroll.
- Opening animation where the hero is typed as code, compiled, and flown into the copper nameplate.
- Interactive terminal with `whoami`, `skills --list`, `projects`, `git log`, and `contact`.
- Project cards with an x-ray schematic lens and a live preview window that runs each project inside the page.
- The stack as an exploded chip that separates layer by layer while pinned.
- Career rendered as a git commit graph, with a `git show` diff for every period.
- Contact form with a live request preview, Turnstile verification, and delivery through a Cloudflare Worker and Resend.
- Portuguese at `/` and English at `/en/`, each with its own build-time metadata and `hreflang`, an animated language switch, and a redirect to the system language on arrival.
- Privacy-first analytics that load only after the visitor accepts cookies, with a privacy page in both languages.
- Light and dark themes, custom cursors, styled scrollbars, résumé download, a not found page, and a skip link.
- Unit and property-based tests with Vitest and fast-check for the site and the worker.
- CI, test, deployment, and OpenSSF Scorecard workflows, plus Dependabot updates.
- Lighthouse CI audits for both languages and a pull request title check.
- Security policy, contributing guide, code of conduct, issue and pull request templates, and CODEOWNERS.

### Changed

- Tailwind replaced with plain CSS.
- The site moved to the root of `plovatto.dev`, with SparkChat and PetLand on their own subdomains.
- README redesigned around the project visuals, with a Portuguese version in `README.pt-BR.md`.
- The Node.js version is defined in `.nvmrc` and read by the workflows.

### Security

- Workflow actions pinned by commit hash, with restricted permissions.
- Dependencies updated with security fixes.

[1.0.0]: https://github.com/Plovatto/Portfolio/releases/tag/v1.0.0
