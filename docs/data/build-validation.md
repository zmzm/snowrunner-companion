# Build compatibility validation

Implements [compatibility ticket](https://trello.com/c/r5yt6AXR).
`validateBuild(build, catalog, player?)` is a pure public export from
`@snowrunner/domain`. It performs no I/O and does not load game data.

Validate external inputs using `truckBuildSchema` and
`compatibilityCatalogSchema` from `@snowrunner/game-data` before calling it.
The catalog reuses the normalized dataset (version, trucks, components and
provenance) and adds `rulesByTruck`. Existing dataset importers can continue
using `datasetSchema`, where this field is optional. The compatibility schema
requires the field and checks rule provenance using the dataset's sources.
Missing truck entries remain unknown. `ruleCompletenessByTruck` optionally
records separate sourced coverage. A false, unknown or absent truck entry in
this supplied map prevents a compatible verdict while allowing known restrictions
to produce violations. Without this map, a known rule list retains its original
exhaustive meaning.

Each truck's sourced rule list describes all reviewed additional restrictions:

- `forbidden`: the component is explicitly prohibited for this truck.
- `requires-any`: selecting a component requires at least one ID from a nonempty
  list; multiple rules apply together.
- `requires`: selecting `componentId` requires `requiredComponentId`.
- `excludes`: selecting `componentId` forbids `excludedComponentId`.
- `forbids-fixed-bed`: selecting `componentId` is forbidden when the truck's
  sourced bed is fixed. A fixed bed alone does not forbid arbitrary equipment.

A known empty rule list asserts that no additional restrictions apply. Use
unknown/conflict until the integration review can establish completeness.
Socket compatible lists are exhaustive when known. An occupied socket's
excluded IDs forbid those components anywhere in the build. Wheel suspension
IDs are alternatives: at least one listed suspension must be explicitly selected;
a known empty list means no prerequisite. These semantics must be verified by
source adapters rather than mapped from similarly named XML attributes blindly.

The validator checks explicit selections, socket occupancy and kind, fitment,
socket exclusions, wheel prerequisites, sourced dependency/exclusion/bed rules,
and truck/component access. No defaults are installed and empty sockets are
allowed; this validates a partial configuration, not a complete drivable truck.
Optional player access supplies rank, explored regions and owned DLC IDs.
Rank/exploration/DLC gates without a profile remain unknown. Stats, drivetrain
and cargo totals are outside this compatibility operation.

The result contains `status`, structured `violations` and `warnings` with codes,
subjects, messages and source IDs where available. Proven incompatibility takes
precedence over unknown evidence; warnings remain available in either case.
Version mismatches and missing catalog entities generate warnings. Known
exhaustive fitment can still prohibit an absent component ID. Alternatives are
single replacements in occupied sockets drawn from known catalog fitment lists;
each replacement must make the entire resulting build compatible. Multi-change
repairs and component removals are not enumerated. Results preserve catalog and
selection ordering and do not mutate inputs.

## Integration handoff and limits

The production catalog remains empty. Committed tests use an authored synthetic
ANK-shaped dataset parsed through shared schemas, not game-derived fixtures.
The integration task must review source versions, resolve component IDs and
truck-specific sockets, establish exhaustive fitment and restriction lists,
map wheel prerequisites, and verify fixed-bed rules. Unsupported XML operations
must remain unknown. Rule collections share one evidence state/source. For partial collections, supply
known extracted rules together with false/unknown `ruleCompletenessByTruck`;
use a provenance record for the complete hashed derivation manifest when rules
depend on multiple files. Physical geometry, multi-socket equipment occupancy and
additional game constraints have no implicit rules here.

Local raw/normalized smoke probes and their reports belong in ignored
`data/reports/`. Raw XML is not a validator input: without a reviewed normalization
mapping, such probes verify conservative unknown handling only. They do not
certify actual ANK MK38 configurations, even when XML syntax parses successfully.

## Private historical-source integration check

The ignored local harness `data/reports/ank-raw-validation.ts` exercises raw
relationship normalization and validation, rather than substituting an unrelated
normalized truck. Run it locally with `pnpm exec tsx` when the research snapshot
is available. Output files use exclusive creation; preserve earlier runs and
choose a new report version before rerunning. No local research input is needed
by CI or committed tests.

The harness parses the actual ANK truck XML and referenced engine, gearbox and
suspension family files. It resolves explicit defaults to named family variants,
retains explicit wheel family/scale references, validates the resulting private
catalog through shared schemas, and tests:

- Actual mechanical defaults and a listed wheel reference produce no fitment
  violations; overall status remains unknown due to unresolved constraints.
- A real wheel reference from another truck, absent from ANK's explicit list,
  produces an evidenced fitment violation.
- An actual engine selected in the suspension socket produces a kind violation.
- Removing suspension preserves unknown wheel prerequisites rather than
  inventing suspension requirements from wheel dimensions.

The ignored report records input hashes, file/line mappings, case results and
limits. Provenance comes from the local snapshot manifest. This is historical
relationship coverage, not a verified current-game catalog: wheel references
still need tire/rim resolution, and templates, add-on exclusions, fixed-bed rules,
DLC and unlock mapping remain unresolved. No positive overall compatibility
verdict is asserted. The earlier smoke report tested unknown handling only;
it is superseded for raw relationship coverage by this integration check.

## Six-step historical integration pass

The next local harness, `data/reports/ank-six-steps.ts`, resolves scoped template
libraries and unique parent hierarchies through the importer public API. It
normalizes actual tire/rim combinations and suspension clearance, identifies
add-on candidates through install socket types, maps mutual socket exclusions
and truck-wide exclusions, and records direct on-truck cargo-slot evidence.
The derivation manifest contains file hashes, attribute origins and case results.
Run it with `pnpm exec tsx data/reports/ank-six-steps.ts <new-run-label>`.
It never overwrites a previous run. These files and outputs remain ignored.

The supported raw suspension/wheel pair, missing suspension, incompatible pair,
truck-wide excluded add-on and a mutual exclusion pair are exercised. A matrix
checks every resolved tire/rim and suspension combination against the derived
clearance sets. The raw XML does not uniquely select the stock wheel scale in
this mapping, so no stock-build pass is claimed. No dependency is fabricated
when the candidate set supplies no required-add-on rule.

The latest XML-only pass supports `_noinherit` resets and `_inheritRemove`
removals for unambiguous matches, with synthetic regression coverage. Unknown or
invalid directives and ambiguous matches still produce issues. The private
harness retains all source hashes and never edits a raw file.

The completeness review remains **incomplete for the whole catalog**. One malformed
add-on source is quarantined; its non-whitespace text is rejected by the strict
parser. A parseable metadata fragment does not make the whole source valid, so
it is not silently repaired or accepted. Multiple scales still match the stock
wheel identifiers even after applying default suspension clearance. The default
selection stays unknown; explicit wheel selections can still be evaluated.

**No game installation is required for this XML-only scope.** The catalog reports
what the pinned historical XML and documented semantics support. Bed menu behavior,
current-game parity, source authenticity and player ownership are outside that
scope. They are limitations, not requests for the user to install or run the game.
The production catalog stays empty. The latest private summary is
`data/reports/ank-xml-only-handoff.md`.

Semantic references used for this pass:

- [Wheel classes and scale](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/truck/truckdata/compatiblewheels/)
- [Suspension clearance](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/truck/truckdata/suspensionsocket/)
- [Add-on socket groups](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/truck/gamedata/addonsockets/)
- [Socket exclusions](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/truck/gamedata/addonsockets/socket/)
- [Required add-ons](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/truckaddon/gamedata/requiredaddon/)
- [Truck exclusions](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/truck/gamedata/)
- [Cargo-slot semantics](https://expeditions-guides.saber.games/truck_modding/tags_and_attributes_of_trucks/truckaddon/gamedata/addonslots/)
