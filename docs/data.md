# Data provenance and source boundaries

## Current state

No game data has been imported. `catalogStatus` reports schema version 1, no dataset
version, zero truck IDs and no sources. The provenance Zod schema validates metadata
only; it is not a truck schema, importer or compatibility engine.

## Source audits

The [ANK MK38 source audit](data/ank-mk38-source-audit.md) records source locations,
version limits, evidence questions and separate readiness decisions. Source-independent
development can proceed with synthetic fixtures. Real datasets and imagery are not
Distribution Approved; the production catalog remains empty. Detailed research
observations live in optional ignored `data/reports/` output, not shipped data.

## Separate development and distribution gates

**Development Ready** permits implementing offline importers, schemas, rules,
synthetic fixtures and a local prototype. Agents may research publicly accessible
materials only when the access and use comply with applicable conditions; public
availability alone does not establish that permission. If rights to a particular
source are unresolved, keep working with synthetic data rather than representing
that source as approved.

A developer may place permitted research inputs in ignored `data/raw/`, locally
normalized artifacts in `data/normalized/` and generated reports in
`data/reports/`. Optional generated, unapproved runtime catalogs go under
`packages/game-data/generated/` and must remain entirely local. Do not commit,
upload, attach to issues/PRs, log raw contents, or package these artifacts in CI,
web builds, static assets or previews. `.gitignore` reduces accidental commits
but does not prevent forced adds, prior history or copying via other channels.

**Distribution Approved** requires verified source rights, attribution terms,
versions/provenance and a reviewed transform/output. This applies to normalized
JSON derived from source files as well as to original XML and imagery; converting
a format does not automatically remove restrictions. The build must fail closed:
do not import local research files from browser code or ship them by copying them
into `apps/web/public/` or any tracked package export.

The ANK MK38 audit's **no-go** is a distribution decision, not a ban on writing
parsers or testing deterministic rules with synthetic fixtures. Importing or
redistributing particular real source materials remains conditional on their terms.
A private GitHub repository does not change the permission requirement.

### Repository storage layout

```text
data/raw/                     locally obtained research inputs (ignored)
data/normalized/              research-only normalized JSON (ignored)
data/reports/                 local validation / provenance reports (ignored)
packages/game-data/generated/ unapproved generated development catalogs (ignored)
fixtures/synthetic/           optional authored synthetic fixtures (may be tracked)
```

Tracked source and tests must not assume these folders are present. Production
bundles must work without them. Run `pnpm check:data-boundary` to verify the
known forbidden paths have not entered tracked files. This check cannot establish
legal clearance or inspect every possible source of embedded data.

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
5. Review rights and normalized artifacts before any distribution commit; keep raw archives and unapproved output outside Git.

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
