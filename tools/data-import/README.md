# Data import

Reserved for offline parsing and normalization of legally obtained source material.
No CLI, network fetcher, XML parser, or Sheets importer is implemented yet.

Future importers must validate and produce versioned artifacts consumed through
`@snowrunner/game-data`. See [data policy](../../docs/data.md) before adding inputs.
Raw archives stay outside Git and browser code must never import this package.
