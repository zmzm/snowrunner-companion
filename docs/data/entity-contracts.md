# Normalized entity contracts

Implements [domain entities ticket](https://trello.com/c/3Thg6SJF).
Types are public exports of `@snowrunner/domain`; Zod schemas are public exports
of `@snowrunner/game-data`. Domain remains independent of Zod and I/O, following
[ADR 001](../architecture.md). No source-specific Sheets or XML structures enter
these contracts.

- `Truck`: identity, availability, sourced drivetrain modes, bed configuration and
  sourced socket inventory. A fixed bed carries onboard capacity; an add-on bed
  references a socket. Neither implies trailer capacity.
- `Component`: engine, gearbox, suspension, wheels, winch or add-on, discriminated
  by `kind`. Units are explicit in field names; adapters must resolve units before
  supplying known values. Wheels record sourced suspension IDs; an unknown list
  remains unresolved, while a known empty list means no suspension prerequisite.
- `TruckSocket`: component kind, explicit compatible IDs, default (including known
  absence), and exclusions. Unknown compatibility must not become an empty list.
- `Availability`: sourced rank, exploration or available unlock and DLC IDs.
- `TruckBuild`: schema version 1, dataset version, truck and socket selections.
  Each socket can be selected once. No default selections are invented.
- `Requirement`: cargo with explicit on-truck/trailer location, equipment, AWD or
  terrain. These are inputs to future feasibility rules, not a ranking policy.

`datasetSchema` requires schema and dataset versions and provenance records. It
rejects duplicate source/truck/component IDs and dangling fact provenance IDs.
Known facts require a source ID; unknowns require a reason; conflicts require a
reason and at least two distinct source IDs. Strict entity objects reject unexpected
fields rather than silently dropping them. Missing facts receive no defaults.
Existing provenance validation is preserved.

These schemas validate structure and provenance references. They do not resolve
component/socket references, prove a default is installable, evaluate suspension
fitment, check build feasibility or enforce unlocks against a player profile.
Those checks belong to later catalog resolution and domain rules.

## Acceptance evidence

`packages/game-data/src/entities.test.ts` contains an authored synthetic ANK-shaped
scenario, all six component variants and a versioned build/dataset. Its names and
values are test data, not validated SnowRunner facts. Tests cover fixed versus
add-on beds, unknowns/conflicts, availability, wheel prerequisites, malformed values
with error paths, duplicate selections, versions, provenance and cargo locations.
Tests do not require local research inputs or change the empty production catalog.

No importer, rules engine, UI, persistence implementation or game data is supplied
by this ticket.
