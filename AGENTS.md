# Coding agent instructions

## Read before changing code

- [README.md](README.md): workspace map, prerequisites and executable commands.
- [ADR 001](docs/architecture.md): authoritative module responsibilities and import rules.
- [MVP](docs/product/mvp.md): authoritative scope and first vertical slice.
- [Data policy](docs/data.md): provenance, source versions, unknowns and usage rights.

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

## Game data research and distribution boundary

Two separate gates apply; see [data policy](docs/data.md).

**Development/research:** Agents may inspect lawfully accessible public reference
material and may build offline parsers, normalize evidence into local ignored paths,
and validate hypotheses using clearly marked development data. Public accessibility
does not by itself grant rights to copy, extract, or redistribute the material.
Honor applicable source terms and access controls; if the permitted scope is unclear,
use synthetic fixtures and document the outstanding question. Never bypass access
restrictions or download game archives merely because they exist online.

**Distribution:** Only independently cleared, source-attributed and reviewed
datasets/assets can be committed as shipped data or bundled into the web application.
Treat derived JSON as potentially subject to source restrictions too. A private repo
or `.gitignore` is not a license or a confidentiality guarantee.

Place any permitted local research inputs under `data/raw/`, normalized output
under `data/normalized/`, and research reports under `data/reports/`.
These paths and `packages/game-data/generated/` are git-ignored. Do not put them
in `apps/web/public/`, static imports, remote deployments, pull-request attachments,
CI artifacts or logs. Never commit source XML or archives. Use synthetic fixtures
for committed tests. Do not force-add ignored files.

Before claiming a feature is ready, distinguish **Development Ready** (local,
non-distributed validation) from **Distribution Approved** (rights and source
verification recorded). Lack of distribution clearance does not block implementing
parsers, schemas, compatibility rules or an offline prototype. Do not claim
compatibility with the current SnowRunner version from historical XML alone.
Run `pnpm check:data-boundary` before completion.

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
work before editing and preserve unrelated user changes. Never commit secrets,
raw game archives or assets without confirmed usage rights. Do not publish,
push, deploy, modify remote tickets, delete user data or rewrite history unless
the user has authorized that action. Local reversible preparation and verification
within the requested work do not need repeated confirmation.
