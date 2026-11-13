# Coding agent instructions

## Read before changing code

- [README.md](README.md): workspace map, prerequisites and executable commands.
- [ADR 001](docs/architecture.md): authoritative module responsibilities and import rules.
- [MVP](docs/product/mvp.md): authoritative scope and first vertical slice.
- [Data policy](docs/data.md): provenance, source versions and unknowns.

## Work within the architecture

Navigate using the README workspace map. Import other packages through their
`@snowrunner/*` public exports and declare them with `workspace:*`; never reach
into another package's source by relative path. Follow ADR 001's allowed graph.
Keep deterministic entities and compatibility/recommendation rules in `domain`,
source adapters in `tools/data-import`, normalized data in `game-data`, generic
components in `ui`, and state/persistence/composition in `web`.

Use strict TypeScript, explicit boundary types and `import type`. Avoid `any`,
unchecked casts and non-null assertions; narrow or validate external input.
Validate untrusted inputs with Zod at ingestion/storage boundaries. Do not add
runtime I/O, React or browser dependencies to domain. Keep tests next to source
as `*.test.ts` or `*.test.tsx`; prefer behavior and regression coverage over tests
that repeat implementation. Synthetic fixtures must be clearly identified.

Never infer missing game stats or compatibility. Represent unknown/conflicting
facts explicitly according to the data policy. No mock catalog may masquerade
as validated game data. Do not implement future features just to fill empty packages.

## Local research data

This is a private proof-of-concept for local research. Place locally obtained
inputs under `data/raw/`, normalized output under `data/normalized/`, and
research reports under `data/reports/`. These paths and
`packages/game-data/generated/` are git-ignored. Keep raw archives, extracted
source XML and generated development catalogs out of tracked files, browser
bundles, CI artifacts and logs: do not commit them, force-add ignored files,
or import them from `apps/web` code. Use clearly identified synthetic fixtures
for committed tests, and never present development output as a validated game
dataset. Run `pnpm check:data-boundary` before completion.

## Verification before reporting completion

From repository root, install with `pnpm install --frozen-lockfile` when dependencies
are absent, then run **`pnpm check`** (including the tracked-data boundary check). This runs formatting, lint, all package
TypeScript checks, tests and production build. If dependencies change, update and
commit `pnpm-lock.yaml` and validate frozen installation. For web behavior changes,
also launch `pnpm dev` and check the affected flow in a browser where available.
Report checks actually run, results, and anything blocked; do not claim unrun checks
passed. CI uses the same root command. Keep README claims aligned with reality.

## Scope and permissions

Prefer small, ticket-scoped changes; use existing pnpm tooling. Do not introduce a
backend, 3D, accounts or fleet expansion without a scope change. Read existing
work before editing and preserve unrelated user changes. Never commit secrets
or raw game archives. Do not publish,
push, deploy, modify remote tickets, delete user data or rewrite history unless
the user has authorized that action. Local reversible preparation and verification
within the requested work do not need repeated confirmation.
