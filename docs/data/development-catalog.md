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
inventory; dangling wheel dependencies become unknown; dangling rules become unknown.

Compatibility consumers can pass `{ ...result.dataset, rulesByTruck:
result.dataset.rulesByTruck ?? {} }` to validateBuild. Restriction completeness
always remains unknown pending current-game verification. Garage may consume the
same Truck/Component objects and render sourced states. This ticket adds no Garage
UI or browser loader. Never import the local result into apps/web or publish it.

## ANK MK38 evidence status

No actual ANK MK38 projection is confirmed by this implementation. The committed
end-to-end test proves only an authored synthetic ANK-shaped fixed-bed scenario.
Real engines, gearboxes, suspension, wheels, winches, addons, complete sockets,
defaults, exclusions and required-addon semantics remain unconfirmed here.
Actual price disagreements and other inconsistencies must be recorded per source
in a local review/report; none are asserted without that evidence. Historical XML
versions do not establish current-game behavior, DLC precedence or exhaustive
restriction coverage. Development readiness and distribution approval are separate;
the production catalog remains empty.
