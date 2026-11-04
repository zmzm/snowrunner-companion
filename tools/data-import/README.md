# Data import

Reserved for offline parsing and normalization of legally obtained source material.
No CLI, network fetcher, XML parser, or Sheets importer is implemented yet.

Future importers must validate and produce versioned artifacts consumed through
`@snowrunner/game-data`. See [data policy](../../docs/data.md) before adding inputs.
Raw archives stay outside Git and browser code must never import this package.

## Research mode

Development may proceed with synthetic fixtures and, where permitted by source
terms, locally inspected game data. Keep research inputs in `data/raw/`, transformed
JSON in `data/normalized/`, and reports in `data/reports/`; all are ignored.
Never commit or distribute original XML, raw game archives or unapproved derived
artifacts. Public availability does not establish reuse permission.

Distribution of a normalized catalog has a separate approval gate. Importers must
record provenance, unknown facts, source/version ambiguity and any permission
status. The current ANK MK38 audit blocks distribution, not parser development.
Generated local catalogs must not be imported into a production web build.
See [data policy](../../docs/data.md).
