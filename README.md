# SnowRunner Companion

An independent fan companion centered on a 2D truck garage, quick-reference catalog,
and task-oriented Truck Finder. The first planned vertical slice covers **ANK MK38**.

## Current status

This repository implements the foundation from [initialization ticket](https://trello.com/c/IpcOwF4R):
a pnpm workspace, React app shell, shared packages, a provenance schema, tests,
formatting, linting, strict type checking and CI. The preview shows planned product areas.
**No game dataset, importer, compatibility engine, Finder, interactive Garage or build
persistence is functional yet.** No licensed game assets are included.

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

| Command             | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| `pnpm dev`          | Web development server                                 |
| `pnpm lint`         | ESLint, including package import restrictions          |
| `pnpm typecheck`    | Strict TypeScript checks for all five packages         |
| `pnpm test`         | Vitest provenance and app integration checks           |
| `pnpm test:watch`   | Watch tests during development                         |
| `pnpm build`        | Typecheck workspace and build app into `apps/web/dist` |
| `pnpm preview`      | Serve the production build locally                     |
| `pnpm format`       | Format source and docs                                 |
| `pnpm format:check` | Verify formatting                                      |
| `pnpm check`        | All CI quality gates                                   |

## Structure

```text
apps/web/              React + Vite composition and future app state/persistence
packages/domain/       Pure domain types; future entities and deterministic rules
packages/game-data/    Provenance validation; future normalized versioned catalog
packages/ui/           Generic React presentation components
tools/data-import/    Reserved offline ingestion boundary (no importer yet)
docs/architecture.md   Architecture decision and dependency rules
docs/data.md           Source, versioning and unknown-data policy
docs/product/mvp.md    Agreed product scope and first-slice definition of done
```

Workspace packages expose TypeScript source directly to Vite/TypeScript; they are
private and require no separate publishing or build orchestration. See
[ADR 001 and dependency graph](docs/architecture.md).

## Data import status

The catalog is empty. SR!NFO overview data and legally sourced game XML are proposed
sources, subject to usage-rights verification. Runtime UI must consume reviewed,
normalized artifacts, never live Google Sheets. Source schemas, XML adapters and
truck compatibility rules remain future tasks. Read the [data policy](docs/data.md)
before adding data or images.

## Contribution workflow

1. Use a small branch tied to a ticket and read [AGENTS.md](AGENTS.md).
2. Keep changes within [package boundaries](docs/architecture.md); record changed
   architectural decisions in docs.
3. Add meaningful tests for behavior and regressions. Never invent game facts to
   make a test or UI look complete.
4. Run `pnpm check` and review the diff for secrets and unlicensed assets.
5. Open a pull request describing behavior, validation and known limitations.

The public repository is hosted on [GitHub](https://github.com/zmzm/snowrunner-companion),
with `main` as the default branch. No open-source license has been selected yet.
