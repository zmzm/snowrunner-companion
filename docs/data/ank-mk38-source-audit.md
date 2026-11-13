# ANK MK38 source notes

Ticket: [Audit ANK MK38 data sources](https://trello.com/c/C3Cl1Voy).
Audited 2026-11-04. Scope: original ANK MK38, separately from ANK MK38 Civilian.

This tracked document records source locations, evidence questions and the
extraction handoff. Detailed source observations and per-file hashes are local
research output in `data/reports/ank-mk38-source-audit.md` (ignored and optional).
A clean clone does not include that report; no build or test may depend on it.
No raw XML, archives, source exports, images or generated catalog are included.

## Sources

| Source                       | Locator / version evidence                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SR!NFO                       | [Workbook](https://docs.google.com/spreadsheets/d/1TPla-u2zxpzFMhpxzymhwzxDU_x85Y_1SxylgRPonH0/edit); Trucks gid1541278619, Engines gid1324019493, Gearboxes gid1636864511, Wheels gid1422932161, Addons gid400884658                                                                                                                                                                                            |
| Historical XML mirror        | [Pinned snapshot](https://github.com/DevAnyKR/SnowRunner.initial.pak/tree/23df61034846c5731b742d76e5958b413eda448f), branch Original_14_2; maintainer cites update 2025-02-28 / dlc_14_2, commit dated 2025-03-01T02:23:27Z                                                                                                                                                                                      |
| Mirror's main branch         | [Repository](https://github.com/DevAnyKR/SnowRunner.initial.pak); contains tuning changes, so do not substitute it for stock evidence                                                                                                                                                                                                                                                                            |
| User-owned game installation | Not supplied                                                                                                                                                                                                                                                                                                                                                                                                     |
| Official modding docs        | [File paths](https://expeditions-guides.saber.games/map_modding/getting_started/file_paths_and_naming/file_paths/), [part IDs](https://expeditions-guides.saber.games/map_modding/creating_a_map/trucks/how_to_identify_ids_of_truck_parts/), [component XML](https://expeditions-guides.saber.games/truck_modding/getting_started/simple_truck_mod_from_scratch/step_6_creating_xml_files_of_truck_components/) |

The initial audit inspected the truck class and directly referenced engine,
gearbox, suspension and winch families, plus ANK wheel and sideboard addon
classes. Family/default references and fragments parsed successfully, but
transitive resolution and normalization were not implemented. Source-specific
field values, IDs, hashes and the detailed conflict table remain in the ignored
local report. This tracked record is not a validated game dataset.

## Evidence questions retained

- The workbook truck price and historical XML price differ. Preserve the separate
  values, source locators, versions and price/configuration semantics; do not
  select a winner or invent a total-price formula. See the local report for
  observations.
- Stock/maximum torque endpoints agree numerically across the inspected sources.
  That does not establish units or identical configurations.
- Tuned and claimed-original snapshots differ in unlock behavior. Reject tuned
  values as stock evidence rather than silently combining them.
- Direct truck cargo slots and a separate bed addon are different evidence. An
  addon filename does not establish an installation socket or removability.
- Trailer socket families are constrained by exclusions. Cargo capacity onboard
  must remain distinct from trailer capacity.
- Blank equipment cells mean unresolved evidence, not verified incompatibility.
  Keep `known`, `unknown` and `conflict` states under the [data policy](../data.md).

## Extraction handoff

1. Implement parsers and schemas against authored synthetic fixtures. Label them
   explicitly; do not copy historical stats into a supposedly synthetic catalog.
2. For local game files, record storefront, platform, game build, mod/DLC state
   and archive hash. Inspect a separate local copy of
   `<install>/preload/paks/client/initial.pak`; do not modify the installed
   archive.
3. Start at `[media]/classes/trucks/ank_mk38.xml` in the target stock archive and
   follow actual type/default references. Resolve the `trucks` template library,
   transitive includes, localization, DLC overrides, replacements, additional
   wheel classes and necessary cargo/trailer/tuning classes. The seven
   historically inspected files alone do not form a complete dependency set.
4. Verify fixed-bed behavior, equipment exclusions, unlocks and suspension/wheel
   dependencies; preserve unknowns and conflicting evidence. The
   [XML spike](https://trello.com/c/tYtT1wli) owns that deeper extraction work.
5. Store inputs in `data/raw/`, local normalized output in `data/normalized/`,
   and research reports in `data/reports/`. Any generated catalogs belong in
   `packages/game-data/generated/`. All are ignored; never force-add them or
   include them in browser builds, previews or CI output.
6. Record precise retrieval timestamps, hashes, transformations and unresolved
   references.

`pnpm check:data-boundary` verifies known forbidden tracked paths and archives.
Synthetic fixtures and the production app must work in a clean clone without any
ignored research directories.
