# Contributing

Thanks for helping out. The project is small on purpose — please keep it that way:
no runtime dependencies, no UI framework, no background scripts unless a feature truly needs one.

## Workflow

1. Create a branch from `main`:

   | Prefix                                | For                |
   | ------------------------------------- | ------------------ |
   | `feat/`                               | new functionality  |
   | `fix/`                                | bug fixes          |
   | `docs/`                               | documentation only |
   | `chore/`, `ci/`, `test/`, `refactor/` | everything else    |

2. Make the change **with tests**. Logic goes into `src/lib/` or `src/popup/app.ts`, where it
   can be tested without a browser.
3. Run `pnpm check` — lint, typecheck and tests must pass.
4. Commit using [Conventional Commits](https://www.conventionalcommits.org):
   `feat: add favourite currencies`, `fix: keep amount when date changes`.
5. Open a pull request into `main`. CI runs the same checks and builds both targets.

`main` is always releasable. Feature branches are merged with a merge commit (`--no-ff`).

## Guidelines

- User-visible text lives in `public/_locales/*/messages.json`. Add every new key to **all**
  locales — `tests/locales.test.ts` fails otherwise.
- Do not call `browser.*`, `fetch` or `navigator.clipboard` outside `src/entrypoints/` and
  `src/lib/browser-store.ts`. Pass them in as dependencies (see `AppDeps`).
- A new permission needs a line in [PRIVACY.md](PRIVACY.md) and a good reason.
- Note user-visible changes in [CHANGELOG.md](CHANGELOG.md) under an `Unreleased` heading.

More detail: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
