# ADR 001: Small pnpm workspace with explicit boundaries

- Status: Accepted for repository foundation, 2026-11-04
- Source: [initialization ticket](https://trello.com/c/IpcOwF4R) and
  [agreed MVP decisions](https://trello.com/c/q5DqjLqE)

## Context and decision

The [MVP](product/mvp.md) needs one shared model for truck data, Garage validation
and explainable Finder recommendations. Raw Sheets/XML formats must not spread
into UI or rules. Use React + TypeScript + Vite and the five requested pnpm packages.
No Nx, backend or package publishing is required for this slice.

## Allowed dependency graph

An arrow means “may import.” Only listed cross-package edges are allowed.

```text
apps/web ──────────────> packages/ui
    │
    ├─────────────────> packages/game-data ─────> packages/domain
    └──────────────────────────────────────────> packages/domain

tools/data-import ────> packages/game-data
    └──────────────────────────────────────────> packages/domain
```

- `domain`: framework-free entities and pure deterministic compatibility and
  recommendation rules. No data package, React, DOM, network or filesystem access.
  Currently only an explicit sourced-value type and truck identifier exist.
- `game-data`: source metadata validation and future normalized, versioned artifacts.
  Depends on domain and Zod. Does not fetch external data at runtime.
- `ui`: generic presentation, depends on React only; no truck rules or catalog access.
- `web`: composition, navigation and future Zustand state/IndexedDB persistence;
  passes domain decisions into presentation. No importer in the browser bundle.
- `data-import`: offline source parsing, normalization, validation and future artifact
  generation. Not a running service. No importer or CLI is implemented yet.

ESLint rejects forbidden workspace dependencies, selected forbidden runtime imports
and cross-folder source imports. Package manifests use `workspace:*`; package exports
expose only entry points. Rules document the full boundary: lint does not prove the
absence of every possible I/O operation or dependency cycle. New external dependencies
must be reviewed against the responsibilities above.

## Toolchain and checks

Use Node 24, pinned pnpm, strict shared TypeScript configuration, ESLint and Prettier.
Vite builds the browser app and consumes private workspace source exports directly.
Libraries are checked with `tsc --noEmit`; there are no separately published artifacts.
Vitest runs meaningful source-boundary and app integration tests; CI installs the
lockfile and runs the same `pnpm check` as local development. The app test renders
React server-side to verify package integration; it is not browser interaction coverage.

## Consequences and future seams

This keeps rules independently testable and datasets reproducible without adding
build orchestration. Shared source exports suit this private app but would need a
compiled export strategy before publishing packages. Truck/Component/Socket/Build/
Requirement schemas, deterministic rules, Zustand and IndexedDB integration are
agreed future work, not implemented by the foundation ticket. Follow the
[data policy](data.md) for source/version boundaries.
