# Data provenance and source boundaries

## Current state

No game data has been imported. `catalogStatus` reports schema version 1, no dataset
version, zero truck IDs and no sources. The provenance Zod schema validates metadata. Separate [entity schemas](data/entity-contracts.md)
validate normalized trucks, components, builds, requirements and versioned datasets.
An offline SR!NFO CSV import pipeline exists in `tools/data-import`
([README](../tools/data-import/README.md)): it normalizes operator-supplied local
CSV exports with hash-verified provenance into the dataset contract, tested only
against committed synthetic fixtures. It performs no network access, writes only to
ignored `data/normalized/` and `data/reports/`, and does not change the empty
production catalog. No compatibility engine is implemented.

## Source notes

The [ANK MK38 source notes](data/ank-mk38-source-audit.md) record source locations,
evidence questions and the extraction handoff. Source-independent development
proceeds with synthetic fixtures. Detailed research observations live in optional
ignored `data/reports/` output, not shipped data.

## Local research storage

```text
data/raw/                     locally obtained research inputs (ignored)
data/normalized/              research-only normalized JSON (ignored)
data/reports/                 local validation / provenance reports (ignored)
packages/game-data/generated/ generated development catalogs (ignored)
fixtures/synthetic/           optional authored synthetic fixtures (may be tracked)
```

Tracked source and tests must not assume these folders are present. Production
bundles must work without them. Run `pnpm check:data-boundary` to verify the
known forbidden paths have not entered tracked files.

## Planned inputs

The [MVP decision record](product/mvp.md) identifies SR!NFO Google Sheet overview
specifications and game XML for components, sockets and restrictions. No game
archives, extracted XML, truck photographs or game artwork are included in this
foundation.

## Required import contract

Future imports must:

1. Record stable source ID, exact source URL/location, source version or content hash
   and retrieval timestamp. Local sources may need a schema extension to represent
   a file reference without exposing private machine paths.
2. Validate external formats offline and normalize into application-owned entities.
3. Version schema and dataset separately; associate facts with provenance records.
4. Make transformations reproducible and document conflicts and discarded records.
5. Keep raw archives and generated development output outside Git.

`tools/data-import` owns source-specific formats and I/O. `packages/game-data` owns
normalized artifacts, provenance and future catalog loading. `packages/domain` owns
entities and deterministic rules. `apps/web` consumes these public APIs without
fetching Sheets or parsing XML. There is no runtime Google Sheets dependency.

## Unknowns and conflicts

Use explicit `known`, `unknown` and `conflict` states (`SourcedValue<T>` in domain).
Known facts reference their source ID; unknowns explain missing evidence; conflicts
reference the disagreeing sources and explain the issue. Never turn missing data
into zero, false, a guessed stat or presumed compatibility. Present unknowns clearly
and avoid declaring a build feasible when required constraints are unresolved.
Distinguish trailer cargo capacity from on-truck cargo capacity.

Entity contracts attach provenance to facts, but no real truck entities have
been imported. Future ANK MK38 rules must verify the fixed-bed constraints against
source evidence before representing feasible configurations.
