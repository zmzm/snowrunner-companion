# Agreed SnowRunner Companion MVP

Consolidated from the [4 November 2026 decision comment](https://trello.com/c/q5DqjLqE).
This records existing decisions; it does not claim the features below are implemented.
For actual implementation status and commands, see [README](../../README.md).

## Vision and scenarios

Build a visually appealing 2D virtual truck garage, alongside a separate quick-reference
catalog and a task-oriented Truck Finder. A player can look up a fact without entering
Garage, or describe a task in Finder and open the suggested truck/build directly in
Garage to modify it. Players can eventually save owned trucks and experimental builds
locally; “My Garage” versus “Build Lab” is a conceptual distinction, not a fixed UI layout.

## Screens

1. Home: overview and entry point.
2. Truck Finder: cargo slots, terrain, crane/equipment, AWD and other requirements,
   with explanations and limitations for suitable trucks.
3. Truck Catalog: quick specifications, search and comparisons outside Garage.
4. Virtual Garage: large static 2D truck image, component selectors, configuration
   validation, trustworthy updated stats and alternatives for incompatible choices.
5. My Builds: locally saved configurations.

## First vertical slice

Start with **ANK MK38**. Import and validate its data, parts and constraints, then
prove Finder → selected truck/build → Garage before expanding the fleet. The
agreed example is a fixed two-slot bed, not arbitrary removable frame modules;
implementation must verify source evidence. Finder must model real cargo/equipment
feasibility and distinguish on-truck capacity from trailer capacity.

## Firm technical and design direction

- React, TypeScript, Vite and pnpm workspaces.
- Shared Truck, Component, Socket, Build and Requirement domain vocabulary.
- Offline import and versioned data; Zod validation at external boundaries.
- Pure deterministic compatibility rules and recommendations: hard feasibility
  filters followed by explainable prioritization.
- Zustand for current build state and IndexedDB for local persistence.
- SR!NFO overview specs and game XML for component/socket constraints,
  with provenance, unknowns and conflicts. See [data policy](../data.md).
- Dark industrial visual direction; desktop-friendly Garage and mobile-friendly
  reference/Finder. Component changes need not change the truck image.

The foundation only reserves these seams. Entity details, source adapters, persistence
schema/migrations, ranking policy and exact layout require implementation validation.
Earlier visual mockups were not attached to the repository ticket; this scaffold uses
an original text-only foundation preview rather than claiming to reproduce them.
See [ADR 001](../architecture.md) for package ownership.

## Non-goals

No 3D viewer, accounts/cloud sync, backend, AI recommendations, opaque numerical
performance scores or full-fleet catalog. No Nx orchestration is needed for this slice.

## First-slice definition of done

- Reproducible, source-attributed ANK MK38 catalog data with explicit unknowns.
- Working component selection and tested compatibility constraints.
- Functional 2D Garage with understandable stat changes and basic local persistence.
- Finder opens a suggested build in Garage; quick reference works outside Garage.
- Documented clean-clone installation, testing and production build pass.

Repository quality checks and coding workflow live in [AGENTS.md](../../AGENTS.md)
and README; the first-slice product checklist remains future work.
