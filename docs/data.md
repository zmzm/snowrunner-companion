# Data provenance and source boundaries

## Current state

No game data has been imported. `catalogStatus` reports schema version 1, no dataset
version, zero truck IDs and no sources. The provenance Zod schema validates metadata
only; it is not a truck schema, importer or compatibility engine.

## Planned inputs

The [MVP decision record](product/mvp.md) identifies SR!NFO Google Sheet overview
specifications and legally obtained game XML for components, sockets and restrictions.
Source availability is not permission to redistribute. Verify usage rights before
importing or committing source-derived material. No game archives, extracted XML,
truck photographs or game artwork are included in this foundation.

## Required import contract

Future imports must:

1. Record stable source ID, exact source URL/location, source version or content hash,
   retrieval timestamp and usage-rights basis. Local sources may need a schema
   extension to represent a file reference without exposing private machine paths.
2. Validate external formats offline and normalize into application-owned entities.
3. Version schema and dataset separately; associate facts with provenance records.
4. Make transformations reproducible and document conflicts and discarded records.
5. Review normalized artifacts before committing; keep raw archives outside Git.

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

Provenance is not yet attached to actual truck facts because no truck entities have
been imported. Future ANK MK38 rules must verify the fixed-bed constraints against
reviewed sources before representing feasible configurations.
