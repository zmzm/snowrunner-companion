# Offline development catalog integration

Ticket: [ANK MK38 integration](https://trello.com/c/BC9IFBQU).

`integrateDevelopmentCatalog` from `@snowrunner/data-import` is an offline,
programmatic handoff. It reuses the hash-checked CSV importer, XML evidence spike,
and existing domain/Zod contracts. It never changes the production catalog.
No private files are required to run its adjacent synthetic integration tests.

## Local workflow

1. Prepare the existing CSV manifest and XML manifest with their local contents
   (see the importer README). XML `source.locator` must be a URL, including a
   non-private `file:` or `urn:` locator if appropriate. Do not disclose machine
   paths. Keep inputs under `data/raw/`.
2. Run `extractXml` from the local `tools/data-import/src/xml.ts` module to inspect
   the evidence graph. It does not certify semantics. Review the source meanings,
   family membership, default scope, socket inventory completeness, units and
   canonical IDs. Never infer fitment from names alone.
3. Author a JSON review matching exported `integrationReviewSchema`: version 1,
   datasetVersion, truckId, xmlSourceId, arrays `trucks`, `components`, `rules`,
   and `observations`. Each entity projection contains an existing normalized
   Truck or Component under `entity`, plus `evidence` with relationshipIndexes
   and a nonempty rationale. Each rule similarly contains `rule` and evidence.
   All known projected facts must cite xmlSourceId. Use unknown for every
   unreviewed field. Canonical IDs must match CSV IDs explicitly; newly resolved
   XML-only components may be introduced using the same Component contract.
   A known socket array asserts a complete inventory: do not project partial
   inventories as known. Families map to compatibleComponentIds, defaults to
   defaultComponentId, exclusions to excludedComponentIds or truck-specific
   rules, required addons to requires/requires-any rules, and reviewed wheel
   dependencies to requiredSuspensionIds. This mapping is a manual semantic
   review step, not an automatic interpretation of arbitrary XML attributes.
4. Call the function with the two manifests, two `ReadonlyMap<string, string>`
   contents collections, and review. All manifest/review inputs are validated.
   Exact source versions and hashes, review rationale and evidence remain in the
   report. Any XML resolution issue withholds all XML projections conservatively;
   fix the source/reference issue before retrying. The underlying spike's
   attribute-only inheritance limits remain applicable.
5. Serialize the returned envelope only to ignored `data/normalized/`, and its
   `report` only to ignored `data/reports/`. For example, in a local TypeScript
   operator script using the workspace exports:

   ```ts
   const result = integrateDevelopmentCatalog({
     csvManifest,
     csvContents,
     xmlManifest,
     xmlContents,
     review,
   });
   await writeFile(
     'data/normalized/ank-development.json',
     JSON.stringify(result, null, 2),
   );
   await writeFile(
     'data/reports/ank-integration.json',
     JSON.stringify(result.report, null, 2),
   );
   ```

   Here manifests/review are locally parsed JSON; contents maps contain the exact
   UTF-8 inputs; writeFile comes from node:fs/promises. The function itself has no
   output I/O. Place the local operator script under tools/data-import (so the package self export resolves), and run it using the repository's installed `pnpm exec tsx`.

## Consumption and limits

The envelope is permanently marked developmentOnly and distributionApproved false.
Its dataset passes datasetSchema; malformed normalized projections throw. Compare
sourced facts recursively: unknown does not erase a known fact, disagreement becomes
conflict, and both candidates are retained in report.conflicts. Price has no domain
field: record values and source IDs in review.observations, never discard a price
conflict or reinterpret price as a performance stat. The CSV report retains unmapped
columns. Dangling fitment/default/exclusion references invalidate the known socket
inventory; dangling wheel dependencies become unknown; unresolved rules are diagnosed and withheld while resolved rules remain available with unknown completeness.

Compatibility consumers can pass `{ ...result.dataset, rulesByTruck:
result.dataset.rulesByTruck ?? {} }` to validateBuild. Restriction completeness
always remains unknown pending current-game verification. Garage may consume the
same Truck/Component objects and render sourced states. This ticket adds no Garage
UI or browser loader. Never import the local result into apps/web or publish it.

## ANK MK38 evidence status

The committed end-to-end tests use authored synthetic scenarios across all six
component categories. Optional private verification also maps real workbook and
historical XML inputs. Its reviewed relationships and source disagreements are
recorded in ignored local reports, not shipped as a validated production dataset.
Partial source coverage does not establish complete or current-game compatibility. Historical XML
versions do not establish current-game behavior, DLC precedence or exhaustive
restriction coverage. Development readiness and distribution approval are separate;
the production catalog remains empty.

## Repeatable file workflow

Run `pnpm integrate:catalog -- <local-config.json>` from the repository root.
The configuration is a strict JSON object:

```json
{
  "csvManifest": "../raw/example/csv-manifest.json",
  "xmlManifest": "xml-manifest.json",
  "xmlRoot": "../raw/example/xml",
  "xmlResolution": "xml-resolution.json",
  "review": "review.json",
  "outputName": "example-development-run-1"
}
```

Configuration paths resolve relative to the configuration file. CSV source paths
resolve relative to their manifest; XML source paths resolve relative to xmlRoot
(or the XML manifest directory when omitted). Manifest source paths cannot escape
those directories. Outputs are fixed to `data/normalized/<outputName>.json` and
`data/reports/<outputName>.json`; an existing output or report prevents the run.
The catalog is the complete development envelope; the separate report contains
validation evidence. Console output contains only aggregate projection counts.
No network access is performed. No lockfile or dependencies change for this command.

xmlResolution is optional. Without it, the original attribute-only spike governs
admission. With it, `extractResolvedXml` hash-checks original files and applies the
existing scoped resolver. Configuration fields are entries (an ordered list of
supplied XML paths), references (a record keyed by xmlReferenceKey), omitTags,
childIdentityAttributes, and rationale. Every entry/reference must be hash-verified.
The ordering determines review relationship indexes. Never reuse a review against
a changed graph without inspecting it again. The source version fingerprints the
manifest and resolution settings. Original spike issues remain under rawIssues;
scoped resolver issues govern admission. Omitted subtrees and selected DLC paths
are explicit review decisions, not inferred game-loader semantics.

A report contains projections.applied and projections.withheld. Schema validation
alone is insufficient: verify that the intended facts were applied, canonical IDs
resolve, and completeness remains explicit. Resolved restrictions are retained
when another restriction references a missing component; diagnostics retain the
gap and rule completeness remains unknown. A declared default can remain known
while the exhaustive fitment list is unknown. This does not establish permission
for arbitrary other components.

## Private comprehensive verification

Optional local work reconciles all six component categories against the available
historical snapshot and downloaded workbook. Source-specific inventories, selected
CSV record numbers, per-file hashes, identity mappings, numeric comparisons,
quarantined files, default candidates and build-validation results belong only in
ignored reports. No source-derived fixture or development catalog is committed.

The local comprehensive report distinguishes these outcomes:

- Exact XML identity/localization matches to a CSV row, including family context
  and forward-gear ratios where display names are reused.
- XML-only facts for which the workbook has no equivalent record.
- Tire-level CSV evidence that maps to multiple scale/tire/rim assemblies. A tire
  table is not a complete wheel assembly and cannot establish a default scale.
- Numeric agreement without verified units, retained as unknown normalized stats.
- Source disagreement, missing references, malformed input and unsupported domain
  semantics, retained rather than overwritten or silently repaired.

Verification includes mechanical candidates, wheel/suspension pairs, explicit
restriction cases, deterministic output and CLI replay. Matrix assertions verify
that the validator follows mapped relations; they do not independently prove that
our source interpretation matches the running game. Official interpretation aids:
[SuspensionSocket clearance](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/truck/truckdata/suspensionsocket/),
[wheel assemblies and scaling](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/truck/truckdata/compatiblewheels/),
[factory wheel identifiers](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/truck/truckdata/wheels/),
and [winch ignition requirements](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/winchvariants/winch/).

No game installation is required for this historical-source research. Current-game
equivalence, exhaustive DLC/availability coverage and distribution approval remain
separate assertions. Access conjunctions, an exhaustive equipment-capability
vocabulary and ambiguous stock configurations cannot be guessed to obtain a
positive verdict. These limits do not invalidate independently supported negative
restriction results.
