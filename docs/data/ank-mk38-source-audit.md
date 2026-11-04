# ANK MK38 source and licensing audit

Audit date: 2026-11-04. Ticket: [Audit ANK MK38 data sources and licensing](https://trello.com/c/C3Cl1Voy).
Scope: original ANK MK38; the Civilian is a separate vehicle.

## Decision

SR!NFO is readable and supplies useful candidate facts, but this audit does **not**
clear a redistributable dataset or truck image. Historical XML from a public mirror
was inspected in memory; no local installation was supplied.
Keep the runtime catalog empty. The inventories below are research observations,
not validated catalog artifacts or executable compatibility rules. The remaining
permission and local-file evidence requirements are listed at the end. The audit
is complete with a **no-go for production import** outcome; closing this research
ticket does not certify that legally usable input data has been obtained.

## Source register

| Source                      | Location and observed revision                                                                                                                                                                                                                                                                                                                            | Evidence and limits                                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SR!NFO Trucks               | [Trucks tab, gid 1541278619](https://docs.google.com/spreadsheets/d/1TPla-u2zxpzFMhpxzymhwzxDU_x85Y_1SxylgRPonH0/edit#gid=1541278619)                                                                                                                                                                                                                     | Retrieved anonymously over HTTPS on audit date. Game build, author revision and reuse grant not established.                                             |
| SR!NFO Engines              | [Engines tab, gid 1324019493](https://docs.google.com/spreadsheets/d/1TPla-u2zxpzFMhpxzymhwzxDU_x85Y_1SxylgRPonH0/edit#gid=1324019493)                                                                                                                                                                                                                    | Engine family and display names observed; exact variant IDs and defaults need XML. Same version/rights limitations.                                      |
| SR!NFO component tables     | [Gearboxes](https://docs.google.com/spreadsheets/d/1TPla-u2zxpzFMhpxzymhwzxDU_x85Y_1SxylgRPonH0/edit#gid=1636864511), [Wheels](https://docs.google.com/spreadsheets/d/1TPla-u2zxpzFMhpxzymhwzxDU_x85Y_1SxylgRPonH0/edit#gid=1422932161), [Addons](https://docs.google.com/spreadsheets/d/1TPla-u2zxpzFMhpxzymhwzxDU_x85Y_1SxylgRPonH0/edit#gid=400884658) | Headers and ANK references inspected. These tables alone do not resolve every truck-specific option or exclusion.                                        |
| Installed game XML          | User-owned installation, not provided                                                                                                                                                                                                                                                                                                                     | Platform, storefront, game build, mods, DLC state and archive hash unknown. No authenticated local archive or current-build ANK relationships available. |
| Saber modding documentation | Official pages linked below, accessed on audit date                                                                                                                                                                                                                                                                                                       | Documents file layout and XML mechanisms; examples are not ANK evidence and docs are not tied to an inspected game build.                                |
| Focus terms                 | [EULA](https://www.focus-entmt.com/en/eula), accessed on audit date                                                                                                                                                                                                                                                                                       | General published terms reviewed; applicable installed/storefront agreement and asset-specific clearance remain unresolved.                              |

The web reader could not open the sheet. Direct HTTPS reads of its `htmlview` and
CSV exports succeeded. The overview identified the tab names and gids above.
CSV was parsed in memory; no export, image, archive or XML was saved in this repo.
No explicit dataset licence or attribution terms were identified in the inspected
views; that is not a claim that no separate permission exists.

For reproducibility, SHA-256 hashes identify the exact retrieved CSV bytes, not a
Google revision ID or game version. Export URL pattern:
`https://docs.google.com/spreadsheets/d/1TPla-u2zxpzFMhpxzymhwzxDU_x85Y_1SxylgRPonH0/export?format=csv&gid=<gid>`.

| Tab       | SHA-256                                                            |
| --------- | ------------------------------------------------------------------ |
| Trucks    | `ff2a0e049bd0a321ca12d5c8840ae83bc233c119b51d9f9a9e44b34916832c5e` |
| Engines   | `82a298eb144eafb9dd81867fac668076edb09bce180d34e367e10b6e59768b53` |
| Gearboxes | `617d5b237f0dfc46e8d48d6df70791deb35de7b6cd56363373a9f940dbbb693c` |

Re-exporting a mutable sheet may produce a different hash. No retrieval timestamp
more precise than the audit date was recorded; these notes do not yet satisfy the
production provenance contract.

## Observed field inventory

All values in this section are from the linked SR!NFO tabs on the audit date;
**game version unknown throughout**. A historical mirror comparison follows; it
does not establish current-game truth.

| Trucks field group | Observation                                      | Import qualification                                                                       |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Identity           | XML name `ank_mk38`; Offroad                     | Candidate source ID, not yet validated canonical ID. XML location and DLC cells are blank. |
| Availability       | Exploration; region codes US / NE / CE           | Unlock map/objective and region semantics unresolved.                                      |
| Price              | 75,000                                           | Currency, game mode and stock configuration context need verification.                     |
| Drivetrain         | 6x6; AWD and differential lock always            | Needs XML confirmation.                                                                    |
| Engine summary     | Stock torque 175,000; maximum 210,000            | Header does not specify torque units; preserve raw units until verified.                   |
| Mass and fuel      | 11,704 kg; 200 L                                 | Mass configuration assumptions unresolved.                                                 |
| Wheels             | Medium; 47–51 inches                             | Range does not prove every wheel/suspension pairing.                                       |
| Suspension/chains  | Raised, active, tuned custom and chains marked X | Treat markers as observations until option IDs and conditions are verified.                |
| Cargo              | Built-in two-slot sideboard bed                  | Supports the MVP hypothesis; removability and crane restrictions still need XML evidence.  |
| Trailer/spares     | Trailer / Futom; two spare wheels                | Trailer class/socket semantics and spare-wheel configuration unresolved.                   |
| Other equipment    | Saddle, crane, logging and utility cells blank   | Unknown, not a verified absence or incompatibility.                                        |

Component inventory from Engines rows 130–132 (CSV header counts as row 1):
family `e_us_truck_old_heavy`, A12V-780, A12V-850TTA and Westline V12 M900.
Only the first row names ANK explicitly; later rows use continuation/exception
notation. Their applicability is a candidate interpretation pending XML resolution.
The Wheels table explicitly labels ANKO I for ANK MK38. Gearboxes has no explicit
ANK mention; the Trucks value “Truck” is a family label, not an option list.
The historical mirror supplies additional IDs below, pending stock verification.

## Historical XML mirror

Source: [DevAnyKR/SnowRunner.initial.pak](https://github.com/DevAnyKR/SnowRunner.initial.pak).
Use [Original_14_2 at commit 23df61034846c5731b742d76e5958b413eda448f](https://github.com/DevAnyKR/SnowRunner.initial.pak/tree/23df61034846c5731b742d76e5958b413eda448f),
not `main`. The pinned README calls Original an original backup, dates its update
2025-02-28 and names `dlc_14_2`; the commit is dated 2025-03-01T02:23:27Z.
These are author claims and repository dates, not a verified game build or proof
that the files are untouched. `main` includes tuning changes, including altered
exploration unlocks. No reuse licence was identified (GitHub licence metadata is
null). Public availability does not clear these game-derived files for redistribution.

The seven files below were retrieved over HTTPS and parsed as XML fragments in
memory starting at **2026-11-04T20:39:20.173954+00:00**. A temporary root wrapped
sibling elements for inspection; raw files were not changed or saved. Hashes are
SHA-256 of retrieved bytes before decoding/wrapping. This is source inspection,
not an implemented importer or a resolved dependency graph.

All paths below are relative to `[media]/classes/` at the pinned commit. A raw URL
can be formed with
`https://raw.githubusercontent.com/DevAnyKR/SnowRunner.initial.pak/23df61034846c5731b742d76e5958b413eda448f/%5Bmedia%5D/classes/<path>`.

| File                                                                                                                                                                                                  | SHA-256                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [trucks/ank_mk38.xml](https://github.com/DevAnyKR/SnowRunner.initial.pak/blob/23df61034846c5731b742d76e5958b413eda448f/%5Bmedia%5D/classes/trucks/ank_mk38.xml)                                       | `fa59d8424436952aca11b837048820b765f2de78e3ea8d71d27dc40abd59c30a` |
| [engines/e_us_truck_old_heavy.xml](https://github.com/DevAnyKR/SnowRunner.initial.pak/blob/23df61034846c5731b742d76e5958b413eda448f/%5Bmedia%5D/classes/engines/e_us_truck_old_heavy.xml)             | `8dba20d3eac85b588a468b49e14633d14098f944222426490a7a181275e00df8` |
| [gearboxes/gearboxes_trucks.xml](https://github.com/DevAnyKR/SnowRunner.initial.pak/blob/23df61034846c5731b742d76e5958b413eda448f/%5Bmedia%5D/classes/gearboxes/gearboxes_trucks.xml)                 | `f6a606d338e9357088c57f9379e35f22d47a05ece0d5e312a9e4f72adc51332d` |
| [suspensions/s_ank_mk38.xml](https://github.com/DevAnyKR/SnowRunner.initial.pak/blob/23df61034846c5731b742d76e5958b413eda448f/%5Bmedia%5D/classes/suspensions/s_ank_mk38.xml)                         | `192312c095d3b86a806ce198438738e45a5aa2975be7ba98ccb1d02bf12cc13a` |
| [winches/winches_medium_trucks.xml](https://github.com/DevAnyKR/SnowRunner.initial.pak/blob/23df61034846c5731b742d76e5958b413eda448f/%5Bmedia%5D/classes/winches/winches_medium_trucks.xml)           | `98ddbfe23c4f6cd3cc0afa05761b48a8d2e56c2b7807eeebdc52adc0fc8fbef6` |
| [wheels/wheels_medium_ank_mk38.xml](https://github.com/DevAnyKR/SnowRunner.initial.pak/blob/23df61034846c5731b742d76e5958b413eda448f/%5Bmedia%5D/classes/wheels/wheels_medium_ank_mk38.xml)           | `62e96a524a11838a62bebfc2b85dba3975b06cd3933bbe93c9ce08544b3816e0` |
| [trucks/addons/ank_mk38_sideboard_2.xml](https://github.com/DevAnyKR/SnowRunner.initial.pak/blob/23df61034846c5731b742d76e5958b413eda448f/%5Bmedia%5D/classes/trucks/addons/ank_mk38_sideboard_2.xml) | `61b9845b90f5037c3c7ee38334b152b37143a5409ce14dcbcc6a3b03c46ccaf1` |

### Component references and observations

The truck's socket `Type` and `Default` attributes point to the inspected families.
The following are historical source observations, not current compatibility promises.

| Family     | Observed variant IDs                                                              | Default                                        |
| ---------- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| Engine     | `us_truck_old_heavy_engine_0`, `_1`, `_2` (same full prefix)                      | `us_truck_old_heavy_engine_0`                  |
| Gearbox    | `g_truck_default`, `g_truck_highrange`, `g_truck_offroad`, `g_truck_finetune`     | `g_truck_default`                              |
| Suspension | `ank_mk38_suspension_default`, `_high`, `_ultimate`, `_active` (same full prefix) | `ank_mk38_suspension_default`                  |
| Winch      | `w_medium_trucks_default`, `_ext`, `_pow`, `_ext_pow` (same full prefix)          | `w_medium_trucks_default`                      |
| Wheels     | Type `wheels_medium_ank_mk38`, tire `offroad_ank_nk38_1`, rim `rim_1`             | As listed; retain the source's `nk38` spelling |

Engine variants report raw torque 175000, 190000 and 210000 respectively. Fuel
capacity is 200; differential lock is `Always`. The truck directly contains
`AddonSlots.Quantity=2`. This supports onboard cargo capacity, independently of
trailer capacity. Trailer socket names include `Trailer, LogTrailer`, while
`GameData.ExcludeAddons` names `trailer_log_pole`; a trailer family label alone
therefore cannot prove all trailers fit.

The separate bed file names install socket `ankMk38FrameAddon`; no socket with
that name appears in the inspected original truck. Do not install that addon merely
because its filename mentions ANK. Direct cargo slots support the built-in-bed
interpretation; full fixed-bed/crane validation still requires resolved templates
and comparison with stock files. Cosmetic socket exclusions are also present,
including `AnkMk38Beacon` blocking `AnkMk38SpotlightBeacon`.

### Remaining XML dependency evidence

The truck includes template library `trucks`. That library and any transitive
includes, localization, DLC overrides and replacement mechanisms have not been
resolved. The XML spike must inspect these rather than treating omitted attributes
as absent rules. Additional wheel types referenced by `CompatibleWheels` are:

- `wheels_medium_double`
- `wheels_medium_offroad_double`
- `wheels_medium_highway_double`
- `wheels_medium_allterrain_double`
- `wheels_medium_mudtires_double`
- `wheels_medium_mudtires_ankmk38`

These wheel class files have not been inspected or hashed. Listed scales include
0.6 and 0.65; the last type appears at 0.65. `MaxWheelRadiusWithoutSuspension=0.45`
is observed, but a complete suspension/wheel rule has not been derived. Follow
actual references to tuning, trailer and cargo classes when needed; models and
textures are not necessary inputs for this data audit. The missing item is now an
authenticated, versioned stock dependency set, rather than any public ANK XML at all.

## Conflict and ambiguity register

| Question                 | Evidence available                                                                            | Disposition                                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Price                    | SR!NFO Trucks reports 75,000; pinned historical truck `GameData.Price` is 51100               | Unresolved discrepancy. XML base price and sheet truck price may have different configuration/version semantics; neither is selected as canonical and no total-price formula is assumed. |
| Torque                   | Sheet stock/max are 175,000/210,000; historical engine variants are 175000/190000/210000      | Endpoints agree numerically. Variant/configuration and units must remain attached; this is not a demonstrated torque conflict.                                                           |
| Unlocks                  | Original mirror says exploration true; tuned main says false                                  | Reject tuned main as stock evidence. Preserve original snapshot provenance; verify against the target installation.                                                                      |
| Bed/equipment            | Truck has two direct cargo slots; separate bed addon requires a socket not found on the truck | Supports built-in-bed hypothesis. Do not infer crane or removable-bed compatibility from addon existence or blank sheet cells.                                                           |
| Original versus Civilian | Separate truck classes and sheet entries                                                      | Never merge Civilian sockets/equipment into original ANK.                                                                                                                                |
| Patch drift              | Sheet build unknown; mirror claims DLC14_2-era backup                                         | Current-game parity unresolved. Repository date and retrieval date are not game versions.                                                                                                |

Future disagreements must retain each raw value, source locator, version, unit and
configuration; resolve with an explicit rationale or retain `conflict`. Missing
evidence stays `unknown` under the [data policy](../data.md).

## Reuse and attribution assessment

SR!NFO public read/export access establishes access, not a redistribution grant.
Obtain the owner's explicit terms for selected facts, transformed JSON, repository
redistribution and attribution before importing. Record the permission evidence,
scope and source version; attribution alone does not establish permission.

[Focus's EULA](https://www.focus-entmt.com/en/eula), Appendix 2, permits individuals'
noncommercial commentary content using game imagery, subject to original input,
credit through the official game website, no implied endorsement and other limits.
Third-party IP is excluded and removal rights are reserved. Articles 2–3 reserve
rights and restrict copying/extraction/distribution. Project assessment: these
terms do not establish clearance for raw XML redistribution, a normalized companion
dataset, standalone truck cutouts or repository asset distribution. Check the
applicable storefront agreement and intended use before adopting an asset.

Saber's [Content Policy](https://expeditions-guides.saber.games/content_policy/)
is marked as in development. Its [Mod Approval Policy](https://expeditions-guides.saber.games/mod_approval_policy/)
addresses mod distribution; neither supplies demonstrated companion-app clearance.
No image has been selected or licensed. Continue using the text-only preview.
For future imagery, retain creator, original URL, exact licence/permission, required
credit, allowed modifications and distribution scope. Do not treat a press image,
screenshot or third-party truck photograph as automatically reusable.

## Missing XML and inspection procedure

Saber documents the installed archive location as
`<game installation>\preload\paks\client\initial.pak`
in [File Paths](https://expeditions-guides.saber.games/map_modding/getting_started/file_paths_and_naming/file_paths/).
The storefront installation root must be located on the user's machine; none is
assumed here. Its [part ID guide](https://expeditions-guides.saber.games/map_modding/creating_a_map/trucks/how_to_identify_ids_of_truck_parts/)
places truck classes under `[media]\classes\trucks` and DLC classes under
`[media]\_dlc`. Truck class filenames supply IDs; the Proving Grounds Garage is
another documented way to inspect part IDs.

1. Establish ownership/access and applicable terms for the installed copy. Record
   storefront, platform, exact game build and mod/DLC state. Do not bypass protection.
2. Hash an untouched archive and inspect a separate local copy outside Git with a
   compatible archive reader. Saber's [component guide](https://expeditions-guides.saber.games/truck_modding/getting_started/simple_truck_mod_from_scratch/step_6_creating_xml_files_of_truck_components/)
   documents extraction with tools such as WinRAR; modifying the archive is unnecessary.
3. Locate candidate `[media]\classes\trucks\ank_mk38.xml` using the sheet's
   XML name. This path was inspected in the historical mirror; verify it in the
   local archive. Resolve includes/templates,
   parents and replacement references before interpreting missing attributes.
4. Follow actual socket type/default references to engine, gearbox, suspension and
   winch classes. The official component guide documents their class directories
   and variant `Name` identifiers. Do not substitute its Loadstar example files.
5. Follow wheel and addon references from the inspected truck; retain referenced
   classes, templates, unlock metadata and localization needed to interpret them.
   Resolve suspension-dependent wheels and any replacement truck class. The mirror
   inventory above supplies starting references; verify the local dependency set.
6. Inspect fixed/default bed attachment, cargo slots, trailer sockets and equipment
   dependencies. Saber documents socket-group exclusivity and `NamesBlock` in
   [AddonSockets](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/truck/gamedata/addonsockets/).
   That mechanism alone does not establish any ANK-specific constraint.
7. Record archive-relative paths, source hashes, raw values, units, transformation
   rules and unresolved references. Compare like configurations against the sheet.
   Keep raw archives, extracted XML and artwork outside Git; review permission and
   provenance before committing any derived artifact.

This is a local extraction plan; the audit inspected only a public historical mirror. Do not
apply tutorial modifications that rename parts or remove unlock restrictions:
those would destroy the stock evidence this project needs.

## Audit acceptance and handoff

| Ticket criterion                                                         | Audit result                                                                                                                                                                  |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventory fields/components with source and version where known          | Recorded sheet observations and pinned historical XML paths, IDs, defaults, hashes and version limits.                                                                        |
| Record conflicts without guessing                                        | Price discrepancy retained; torque endpoints agree; unlock and bed ambiguities documented.                                                                                    |
| Verify permissions/attribution                                           | Assessment completed with no-go outcome: no dataset/XML redistribution grant or selected-image clearance established. Attribution obligations and required evidence recorded. |
| Identify missing XML/extraction steps; keep unlicensed assets out of Git | Inspected-file and unresolved-dependency registers plus local extraction procedure provided. No raw game assets added.                                                        |

The research audit can close with this explicit no-go decision. It does not close
the rights-acquisition or stock-verification work required before production import.
Downstream work retains these gates:

- SR!NFO owner: provide a reuse/attribution grant or a source with suitable terms.
- Game owner: supply access to an unmodified local installation/archive and exact
  build details, with the applicable terms available for review.
- XML spike: identify and hash the actual ANK file closure; verify bed, component
  IDs, wheel dependencies, unlocks and equipment constraints against that version.
- Asset selection: document permission for a specific image before adding imagery.
- Importer: once rights and evidence are established, capture precise timestamps,
  schema/dataset versions and source references at ingestion. A hash from this
  research note alone does not make an artifact reviewed or licensed.

The catalog remains empty. Do not mark source data as licensed, replace unknowns
with the historical mirror values, or treat this audit closure as production data
clearance. Trello carries the audit completion summary; this document is the detailed
local deliverable and has not been published by this task.
