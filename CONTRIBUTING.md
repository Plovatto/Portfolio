# Contributing

## Reporting issues

Open an [issue](https://github.com/Plovatto/Portfolio/issues) describing the problem, the steps to reproduce it and the expected behavior. Security problems must be reported through the [security policy](SECURITY.md).

## Submitting changes

1. Create a branch from `main` with a prefix for the type of change: `feature/`, `fix/`, `refactor/`, `chore/` or `docs/`.
2. Write commits using [gitmoji](https://gitmoji.dev/) with [Conventional Commits](https://www.conventionalcommits.org/), for example `:bug: fix: let terminal commands switch while text is typing`.
3. New features and bug fixes must include tests.
4. Before opening a pull request, run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. Changes to the contact worker must also pass `npm run typecheck` and `npm test` inside `worker/`.
5. Open the pull request against `main` describing what was done, the details and how it was tested.
