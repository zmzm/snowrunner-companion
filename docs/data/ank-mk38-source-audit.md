# ANK MK38 source audit and readiness decision

Ticket: [Audit ANK MK38 data sources and licensing](https://trello.com/c/C3Cl1Voy).
Audited 2026-11-04; refined against the development/distribution policy introduced
in commit `867bb38`. Scope: original ANK MK38, separately from ANK MK38 Civilian.

This tracked document records source locations, readiness decisions and the handoff.
Detailed source observations and per-file hashes are local research output in
`data/reports/ank-mk38-source-audit.md` (ignored, optional and not distributed).
A clean clone does not include that report. No build or test may depend on it.
No raw XML, archives, source exports, images or generated catalog are included.
The initial detailed audit was published in commit `02ca9e3`; moving the current
research report to ignored storage does not remove that earlier text from Git
history. This refinement does not rewrite history.

## Readiness

| Gate                  | Decision                                                                   | Practical consequence                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Development Ready     | Ready for source-independent development using authored synthetic fixtures | Schemas, offline parser implementation, deterministic compatibility rules and an offline prototype can proceed. This does not claim these features are implemented.     |
| Real-source research  | Conditional for each source and intended use                               | Public access alone is insufficient. Where access/use conditions are unclear, use synthetic fixtures and keep the question recorded. Ignored storage is not permission. |
| Distribution Approved | Not approved for the proposed dataset or imagery                           | No production catalog, normalized source-derived JSON or image is cleared to ship. Record source rights, attribution, provenance and reviewed output first.             |
| Current-game accuracy | Unverified                                                                 | Historical mirror evidence cannot establish compatibility with the current SnowRunner build.                                                                            |

The earlier “no-go for production import” conclusion applies to distribution of
real source-derived data. It does not block writing parsers, modeling unknowns or
proving rules against clearly synthetic scenarios. No permission grant or new
stock-version verification was obtained during this refinement.

## Sources and provenance limits

| Source                       | Locator / version evidence                                                                                                                                                                                                                                                                                                                                                                                       | Assessment                                                                                                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SR!NFO                       | [Workbook](https://docs.google.com/spreadsheets/d/1TPla-u2zxpzFMhpxzymhwzxDU_x85Y_1SxylgRPonH0/edit); Trucks gid1541278619, Engines gid1324019493, Gearboxes gid1636864511, Wheels gid1422932161, Addons gid400884658                                                                                                                                                                                            | Public views/exports were inspected. Exact game build, workbook revision and applicable reuse terms were not established. Retrieval date is not a source version.                                                                    |
| Historical XML mirror        | [Pinned snapshot](https://github.com/DevAnyKR/SnowRunner.initial.pak/tree/23df61034846c5731b742d76e5958b413eda448f), branch Original_14_2                                                                                                                                                                                                                                                                        | Maintainer claims original backup, update 2025-02-28 / dlc_14_2; commit dated 2025-03-01T02:23:27Z. This pins material without authenticating an official release, exact game build or stock fidelity. No reuse licence established. |
| Mirror's main branch         | [Repository](https://github.com/DevAnyKR/SnowRunner.initial.pak)                                                                                                                                                                                                                                                                                                                                                 | Contains tuning changes. Do not substitute it for stock evidence.                                                                                                                                                                    |
| User-owned game installation | Not supplied                                                                                                                                                                                                                                                                                                                                                                                                     | Platform, storefront, build, archive hash and mod/DLC state remain unknown.                                                                                                                                                          |
| Official modding docs        | [File paths](https://expeditions-guides.saber.games/map_modding/getting_started/file_paths_and_naming/file_paths/), [part IDs](https://expeditions-guides.saber.games/map_modding/creating_a_map/trucks/how_to_identify_ids_of_truck_parts/), [component XML](https://expeditions-guides.saber.games/truck_modding/getting_started/simple_truck_mod_from_scratch/step_6_creating_xml_files_of_truck_components/) | Establish inspection mechanisms, not ANK-specific current-build facts or a companion-app distribution grant.                                                                                                                         |

The initial audit inspected the truck class and directly referenced engine,
gearbox, suspension and winch families, plus ANK wheel and sideboard addon classes.
Family/default references and fragments parsed successfully, but transitive
resolution and normalization were not implemented. Source-specific field values,
IDs, hashes and the detailed conflict table remain in the ignored local report.
This tracked record is not a validated game dataset.

## Evidence questions retained

- The workbook truck price and historical XML price differ. Preserve the separate
  values, source locators, versions and price/configuration semantics; do not select
  a winner or invent a total-price formula. See the local report for observations.
- Stock/maximum torque endpoints agree numerically across the inspected sources.
  That does not establish units, identical configurations or current-build parity.
- Tuned and claimed-original snapshots differ in unlock behavior. Reject tuned
  values as stock evidence rather than silently combining them.
- Direct truck cargo slots and a separate bed addon are different evidence. An
  addon filename does not establish an installation socket or removability.
- Trailer socket families are constrained by exclusions. Cargo capacity onboard
  must remain distinct from trailer capacity.
- Blank equipment cells mean unresolved evidence, not verified incompatibility.
  Keep `known`, `unknown` and `conflict` states under the [data policy](../data.md).

## Rights and attribution outcome

No applicable dataset/XML redistribution grant or specific-image clearance was
established. This is an unresolved rights assessment, not a blanket legal finding
that all local investigation is forbidden. Check each source's access and usage
conditions before further copying or normalization; synthetic fixtures allow
implementation to continue independently.

[Focus's EULA](https://www.focus-entmt.com/en/eula), Appendix 2, provides conditional
individual, noncommercial commentary imagery use, including original input and
creator credit through the official game website. Its exclusions and other terms
still apply. It does not establish clearance for the proposed reusable truck image,
mirrored XML or normalized companion dataset. Review the applicable storefront
agreement and intended use. Saber's [Content Policy](https://expeditions-guides.saber.games/content_policy/)
was marked in development when checked; its [Mod Approval Policy](https://expeditions-guides.saber.games/mod_approval_policy/)
addresses mods and does not demonstrate external-app clearance.

Before distribution, retain the source owner/creator, exact permission or licence,
allowed transformations/distribution, required attribution, source version and
reviewed output. A mirror maintainer's permission alone may not cover underlying
game material. No image has been selected; the app uses its text-only preview.

## Offline development and verification handoff

1. Implement parsers and schemas against authored synthetic fixtures. Label them
   explicitly; do not copy historical stats into a supposedly synthetic catalog.
2. For real inputs, establish permitted access/use and record storefront, platform,
   game build, mod/DLC state and archive hash. Inspect a separate local copy of
   `<install>/preload/paks/client/initial.pak`; do not modify the installed archive
   or obtain game archives from online mirrors.
3. Start at `[media]/classes/trucks/ank_mk38.xml` in the target stock archive and
   follow actual type/default references. Resolve the `trucks` template library,
   transitive includes, localization, DLC overrides, replacements, additional wheel
   classes and necessary cargo/trailer/tuning classes. The seven historically
   inspected files alone do not form a verified complete dependency set.
4. Verify fixed-bed behavior, equipment exclusions, unlocks and suspension/wheel
   dependencies. Preserve unknowns and conflicting evidence instead of claiming
   current-game compatibility. The [XML spike](https://trello.com/c/tYtT1wli)
   owns that deeper extraction work.
5. Store permitted inputs in `data/raw/`, local normalized output in
   `data/normalized/`, and research reports in `data/reports/`. Any unapproved
   generated catalogs belong in `packages/game-data/generated/`. All are ignored;
   never force-add, upload or include them in browser builds, previews or CI output.
6. Record precise retrieval timestamps, hashes, transformations and unresolved
   references. Pass the independent Distribution Approved gate before shipping any
   real dataset or asset. A source hash proves identity, not rights or correctness.

`pnpm check:data-boundary` verifies known forbidden tracked paths and archives.
It cannot establish rights, authenticate sources or guarantee that bundles contain
no copied data. Synthetic fixtures and the production app must work in a clean
clone without any ignored research directories.

## Ticket disposition

The audit remains complete: sources/components were inventoried, conflicts and
version limits recorded, permissions assessed and missing XML/extraction steps
identified. Development Ready and Distribution Approved are separate decisions.
Closing the audit grants neither real-source usage permission nor current-version
compatibility. Future implementation tickets can proceed with synthetic fixtures;
rights acquisition and stock verification remain explicit prerequisites for
shipping real source-derived data.
