# SnowRunner Companion

An independent fan companion centered on a 2D truck garage, quick-reference catalog,
and task-oriented Truck Finder. The first planned vertical slice covers **ANK MK38**.

## Current status

This repository implements the foundation from [initialization ticket](https://trello.com/c/IpcOwF4R):
a pnpm workspace, React app shell, shared packages, provenance and normalized entity schemas, tests,
formatting, linting, strict type checking and CI. The preview shows planned product areas.
**No validated game dataset, compatibility engine, Finder, interactive Garage or build
persistence is functional yet.** The offline CSV importer is implemented and tested
with synthetic fixtures.

## Product

- **Home:** entry point and overview.
- **Finder:** planned cargo/terrain/equipment filters with explainable feasibility results;
  selecting a result opens its suggested build in Garage.
- **Catalog:** planned searchable specifications and comparisons outside Garage.
- **2D Garage:** planned static truck view, compatible component selection and trusted stats.
- **My Builds:** planned local saves for owned trucks and experimental builds.

MVP excludes 3D, accounts, cloud sync, backend services, AI recommendations, opaque
performance ratings and full-fleet support. See [agreed MVP](docs/product/mvp.md).

## Requirements and setup

Use Node.js **24.x** (`.nvmrc` pins the tested version) and **pnpm 10.33.0**.
If using nvm, run `nvm install` and `nvm use` from this folder. Install the pinned
pnpm version with `npm install --global pnpm@10.33.0` if it is not already available.
No API keys, environment files, database or external data access are required.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

## Commands

Run commands at repository root:

| Command                    | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `pnpm dev`                 | Web development server                                 |
| `pnpm import:srnfo`        | Run the offline SR!NFO CSV import pipeline             |
| `pnpm lint`                | ESLint, including package import restrictions          |
| `pnpm typecheck`           | Strict TypeScript checks for all five packages         |
| `pnpm test`                | Vitest provenance and app integration checks           |
| `pnpm test:watch`          | Watch tests during development                         |
| `pnpm build`               | Typecheck workspace and build app into `apps/web/dist` |
| `pnpm preview`             | Serve the production build locally                     |
| `pnpm format`              | Format source and docs                                 |
| `pnpm format:check`        | Verify formatting                                      |
| `pnpm check:data-boundary` | Check forbidden tracked research files and archives    |
| `pnpm check`               | All CI quality gates, including the data boundary      |

The additional `pnpm check:data-boundary` command checks for forbidden tracked research files and archives. It is included in `pnpm check`.

## Structure

```text
apps/web/              React + Vite composition and future app state/persistence
packages/domain/       Pure domain types; future entities and deterministic rules
packages/game-data/    Provenance validation; future normalized versioned catalog
packages/ui/           Generic React presentation components
tools/data-import/    Offline SR!NFO CSV import pipeline (local tool, no network)
docs/architecture.md   Architecture decision and dependency rules
docs/data.md           Source, versioning and unknown-data policy
docs/product/mvp.md    Agreed product scope and first-slice definition of done
fixtures/synthetic/    Committed synthetic import fixtures (not game data)
```

Workspace packages expose TypeScript source directly to Vite/TypeScript; they are
private and require no separate publishing or build orchestration. See
[ADR 001 and dependency graph](docs/architecture.md).

## Data import status

The catalog is empty. SR!NFO overview data and game XML are proposed sources.
Runtime UI must consume reviewed,
normalized artifacts, never live Google Sheets. Normalized entity contracts are documented in [entity contracts](docs/data/entity-contracts.md).
An offline SR!NFO CSV import pipeline is implemented in `tools/data-import`
([README](tools/data-import/README.md)): it normalizes operator-supplied CSV
exports into the versioned dataset contract with hash-verified provenance,
explicit units, known/unknown states and a deterministic report, and is tested
against committed synthetic fixtures only. XML import and truck compatibility
rules remain future tasks. Read the [data policy](docs/data.md)
before adding data or images. The [ANK MK38 source notes](docs/data/ank-mk38-source-audit.md)
record source locations, evidence questions and the extraction handoff. Detailed
research output stays in ignored local reports; the tracked notes explain how to
reproduce the investigation.

## Local game-data research

Research inputs and derived artifacts stay out of Git. Place locally obtained
material in ignored `data/raw/`, `data/normalized/`, `data/reports/` or
`packages/game-data/generated/`. These files must not be committed or imported
into production browser bundles. `pnpm check:data-boundary` checks for forbidden
tracked locations and archive extensions. See [data policy](docs/data.md) and
[agent instructions](AGENTS.md).

The production catalog remains empty. This separation allows the compatibility
engine and 2D Garage prototype to progress with synthetic fixtures while real
game data is imported and validated independently.

## Contribution workflow

1. Use a small branch tied to a ticket and read [AGENTS.md](AGENTS.md).
2. Keep changes within [package boundaries](docs/architecture.md); record changed
   architectural decisions in docs.
3. Add meaningful tests for behavior and regressions. Never invent game facts to
   make a test or UI look complete.
4. Run `pnpm check` and review the diff for secrets.
5. Open a pull request describing behavior, validation and known limitations.

The public repository is hosted on [GitHub](https://github.com/zmzm/snowrunner-companion),
with `main` as the default branch.
