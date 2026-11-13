# Data import

Offline parsing and normalization of source material into the versioned dataset
contract of `@snowrunner/game-data`. This package is a local tool: it is never
imported by browser code and never performs network access.

Implemented: the **SR!NFO CSV import pipeline** (`src/cli.ts`, run via
`pnpm import:srnfo`). It accepts locally supplied CSV exports plus a
Zod-validated manifest, verifies source hashes, normalizes rows into
`Truck`/`Component` entities with `known`/`unknown`/`conflict` provenance
states, validates the assembled dataset against `datasetSchema` and emits
deterministic outputs. An offline XML relationship spike is also available via
`pnpm import:xml`; see [its input contract and limitations](../../docs/data/xml-extraction.md).
It emits development evidence only, not production entities.

## Running an import

```sh
pnpm import:srnfo -- --manifest <manifest.json> \
  [--out data/normalized/srnfo-dataset.json] \
  [--report data/reports/srnfo-import-report.json]
```

File paths inside the manifest are resolved relative to the manifest file.
Defaults write into the ignored `data/normalized/` and `data/reports/`
directories. The dataset is written only when validation succeeds (fail
closed); a report is written once normalization and dataset validation complete.
Manifest, file-read, hash and format errors exit before a report is produced.
Exit code is non-zero on any manifest,
hash, format or validation failure.

A runnable example using committed synthetic data lives in
`fixtures/synthetic/srnfo/` (see below).

## Retrieval and provenance

The tool reads only local files; it contains no Google Sheets client and no
fetcher, so the app never depends on runtime sheet access. Retrieval is
performed by the operator outside this tool (for example, exporting a tab)
into `data/raw/`, and the manifest records the source locator.

Each manifest source record follows `provenanceSchema` (`sourceId`,
`sourceUrl`, `sourceVersion`, `retrievedAt`, `usageRights`) with these
pipeline conventions:

- `sourceUrl` is the canonical locator of the origin (workbook tab URL or
  equivalent), never a private local machine path.
- `sourceVersion` must be `sha256:<64 lowercase hex>` of the exact CSV bytes.
  The importer recomputes the hash of each file and fails on mismatch, so the
  manifest is both provenance record and integrity check. Compute it with
  `sha256sum <file>`.
- Each source backs exactly one file (1:1), one record per exported tab.
- `retrievedAt` is the operator-recorded retrieval timestamp; re-exporting a
  mutable sheet can change the hash, so update both together.

## Manifest and mapping

`manifestVersion: 1` with `datasetVersion`, `sources`, and optional per-tab
file entries (`trucks`, `engines`, `gearboxes`, `wheels`, `addons`; at least
one required). Header names are not hard-coded: the operator maps each logical
field to the actual CSV column name. Unmapped columns are listed in the report
rather than silently dropped; a mapped column missing from the CSV header
fails the import.

- Identity: `trucks.columns.xmlName` (required) and the component `name`.
  Canonical truck IDs are `ank_mk38 → ank-mk38` style slugs (lowercase,
  non-alphanumerics collapsed to single hyphens). Component IDs are
  `kind:slug` (for example `engine:a12v-780`) to stay unique across kinds.
- Tokens: drivetrain (`awd`, `differentialLock`), bed kind and unlock are
  mapped through explicit token tables, e.g. `{"Always": "always-on"}`.
  Unrecognized or blank cells become `unknown` with the reason recorded,
  never a guessed fact.
- Units are explicit. Torque and wheel diameter columns may
  be declared with a verified unit (`N·m`, `inches`) or `unverified`;
  `unverified` produces `unknown` values until the operator has verified the
  unit against the source header.
- Lists (`dlcIds`, `equipment`) split on a configurable separator. A cell
  that is blank or splits to nothing stays `unknown`; known-empty (base game
  only) cannot be established from this source and is never inferred.
- Not derivable from overview sheets: truck socket inventories, wheel/suspension
  prerequisites and component availability always remain `unknown` pending
  resolved game XML evidence.
- Duplicate rows for the same canonical ID: agreeing rows are deduplicated;
  disagreeing fields become `unknown` and the raw values are retained in the
  report under `inconsistencies` (single-source `conflict` requires two
  distinct sources and is reserved for future multi-source merges).

## Determinism and idempotency

Outputs are a pure function of the manifest and input bytes: no clocks, no
randomness, stable entity ordering (first appearance), stable JSON key order,
and atomic file writes. Re-running with unchanged inputs produces
byte-identical files. The JSON report records per-file hashes and row counts,
per-entity field dispositions (`known`/`unknown` with reasons), canonical ID
transformations, discarded rows, unmapped columns, intra-source
inconsistencies and the dataset validation result.

## Synthetic fixture

`fixtures/synthetic/srnfo/` contains an explicitly synthetic,
ANK-MK38-shaped scenario (truck rows shaped like the audited entry, with
invented names such as `synthetic_mk38`). It is committed test/demo data, not
validated game facts; do not copy real values into it. Run it with:

```sh
pnpm import:srnfo -- --manifest fixtures/synthetic/srnfo/manifest.json
```

Development output stays in ignored `data/normalized/` and `data/reports/`;
`pnpm check:data-boundary` verifies those paths and archive extensions stay
out of tracked files.

## Internal structure

The public package exports `runImport`, its result/report types and import error
classes. CSV helpers, manifest mappings and normalization internals are private.

- `manifest.ts`: validate external configuration before file loading.
- `table.ts` and `csv.ts`: read mapped tables and check their headers.
- `candidates.ts`: canonical identities and duplicate-row merging.
- `fields.ts`: interpret sourced facts, units and missing evidence.
- `build-entities.ts`: construct normalized trucks and components.
- `normalize.ts`: coordinate normalization and its diagnostics.
- `run.ts`: verify hashes, validate the dataset and serialize final results.
- `cli.ts`: arguments, local file loading, output writes and exit status.

Normalization diagnostics do not claim dataset validity. Only the completed
import report includes the dataset validation outcome.
