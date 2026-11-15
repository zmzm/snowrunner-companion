import { describe, expect, it } from 'vitest';
import { validateBuild } from '@snowrunner/domain';
import type {
  CompatibilityCatalog,
  SourcedValue,
  TruckBuild,
} from '@snowrunner/domain';
import { compatibilityCatalogSchema, truckBuildSchema } from './index';

// Authored synthetic ANK-shaped data; no game values or compatibility claims.
const known = <T>(value: T): SourcedValue<T> => ({
  status: 'known',
  value,
  sourceId: 'synthetic',
});
const unknown = {
  status: 'unknown',
  reason: 'Unresolved evidence',
} satisfies SourcedValue<never>;
function fixture() {
  const availability = {
    unlock: known({ kind: 'available' }),
    dlcIds: known([]),
  };
  const sockets = ['suspension', 'wheels', 'addon'].map((kind) => ({
    id: kind,
    kind,
    compatibleComponentIds: known(
      kind === 'wheels' ? ['wheels', 'small'] : [kind],
    ),
    defaultComponentId: known(null),
    excludedComponentIds: known([]),
  }));
  const catalog = compatibilityCatalogSchema.parse({
    schemaVersion: 1,
    datasetVersion: 'synthetic-v1',
    sources: [
      {
        sourceId: 'synthetic',
        sourceUrl: 'https://example.com/synthetic',
        sourceVersion: 'v1',
        retrievedAt: '2026-11-13T00:00:00Z',
        usageRights: 'Authored synthetic fixture',
      },
    ],
    trucks: [
      {
        id: 'synthetic-ank',
        name: 'Synthetic ANK shape',
        availability,
        drivetrain: { awd: unknown, differentialLock: unknown },
        bed: known({ kind: 'fixed', cargoSlots: 2 }),
        sockets: known(sockets),
      },
    ],
    components: [
      {
        id: 'suspension',
        name: 'Synthetic lift',
        kind: 'suspension',
        availability,
        liftMm: unknown,
      },
      {
        id: 'wheels',
        name: 'Synthetic wheels',
        kind: 'wheels',
        availability,
        diameterInches: unknown,
        requiredSuspensionIds: known(['suspension']),
      },
      {
        id: 'small',
        name: 'Synthetic alternative',
        kind: 'wheels',
        availability,
        diameterInches: unknown,
        requiredSuspensionIds: known([]),
      },
      {
        id: 'addon',
        name: 'Synthetic equipment',
        kind: 'addon',
        availability,
        cargoSlots: unknown,
        equipment: unknown,
      },
    ],
    rulesByTruck: { 'synthetic-ank': known([]) },
  });
  const build = truckBuildSchema.parse({
    schemaVersion: 1,
    datasetVersion: catalog.datasetVersion,
    truckId: 'synthetic-ank',
    id: 'build',
    name: 'Synthetic build',
    selections: [
      { socketId: 'suspension', componentId: 'suspension' },
      { socketId: 'wheels', componentId: 'wheels' },
    ],
  });
  return { catalog, build };
}
function codes(build: TruckBuild, catalog: CompatibilityCatalog) {
  const result = validateBuild(build, catalog);
  return [...result.violations, ...result.warnings].map((issue) => issue.code);
}
describe('build compatibility with schema-validated synthetic catalogs', () => {
  it('validates deterministically without defaults or irrelevant stat requirements', () => {
    const { build, catalog } = fixture();
    expect(validateBuild(build, catalog)).toEqual({
      status: 'compatible',
      violations: [],
      warnings: [],
      alternatives: [],
    });
    expect(validateBuild(build, catalog)).toEqual(
      validateBuild(build, catalog),
    );
  });
  it('rejects incompatible wheels and offers only a fully checked catalog alternative', () => {
    const { build, catalog } = fixture();
    build.selections = build.selections.filter(
      (selection) => selection.socketId !== 'suspension',
    );
    expect(codes(build, catalog)).toContain('wheel-suspension');
    expect(validateBuild(build, catalog).alternatives).toEqual([
      { socketId: 'wheels', componentId: 'small' },
    ]);
  });
  it('checks dependencies, exclusive equipment and evidenced fixed-bed restrictions', () => {
    const { build, catalog } = fixture();
    build.selections = [
      ...build.selections,
      { socketId: 'addon', componentId: 'addon' },
    ];
    catalog.rulesByTruck['synthetic-ank'] = known([
      {
        kind: 'requires',
        componentId: 'addon',
        requiredComponentId: 'missing',
      },
      { kind: 'excludes', componentId: 'addon', excludedComponentId: 'wheels' },
      { kind: 'forbids-fixed-bed', componentId: 'addon' },
    ]);
    expect(codes(build, catalog)).toEqual(
      expect.arrayContaining([
        'missing-dependency',
        'exclusive-components',
        'fixed-bed',
      ]),
    );
    expect(
      validateBuild(build, catalog).violations.every((issue) =>
        issue.sourceIds.includes('synthetic'),
      ),
    ).toBe(true);
  });
  it('reports unknown IDs, dataset versions and missing restriction evidence', () => {
    const { build, catalog } = fixture();
    build.selections = [{ socketId: 'wheels', componentId: 'missing' }];
    build.datasetVersion = 'old';
    const truck = catalog.trucks[0];
    if (!truck) throw new Error('Fixture missing truck');
    truck.sockets = unknown;
    delete catalog.rulesByTruck['synthetic-ank'];
    expect(validateBuild(build, catalog).status).toBe('unknown');
    expect(codes(build, catalog)).toEqual(
      expect.arrayContaining([
        'unknown-component',
        'dataset-version',
        'rule-evidence',
      ]),
    );
    expect(validateBuild(build, catalog).alternatives).toEqual([]);
  });
  it('preserves conflicting and missing socket evidence', () => {
    const { build, catalog } = fixture();
    const truck = catalog.trucks[0];
    if (!truck) throw new Error('Fixture missing truck');
    truck.sockets = {
      status: 'conflict',
      reason: 'Sources disagree',
      sourceIds: ['synthetic', 'other'],
    };
    const result = validateBuild(build, catalog);
    expect(result.status).toBe('unknown');
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'socket-evidence',
        sourceIds: ['synthetic', 'other'],
      }),
    );
  });
  it('checks occupancy, socket kind and exclusions', () => {
    const { build, catalog } = fixture();
    build.selections = [
      ...build.selections,
      { socketId: 'wheels', componentId: 'suspension' },
    ];
    expect(codes(build, catalog)).toEqual(
      expect.arrayContaining([
        'socket-occupied',
        'component-kind',
        'component-fitment',
      ]),
    );
  });
  it('checks access without inventing player progress', () => {
    const { build, catalog } = fixture();
    const truck = catalog.trucks[0];
    if (!truck) throw new Error('Fixture missing truck');
    truck.availability.unlock = known({ kind: 'rank', rank: 10 });
    expect(validateBuild(build, catalog).status).toBe('unknown');
    expect(
      validateBuild(build, catalog, {
        rank: 0,
        exploredRegionIds: [],
        dlcIds: [],
      }).status,
    ).toBe('incompatible');
    expect(
      validateBuild(build, catalog, {
        rank: 10,
        exploredRegionIds: [],
        dlcIds: [],
      }).status,
    ).toBe('compatible');
  });
  it('preserves unresolved fitment and wheel evidence, and applies socket exclusions', () => {
    const { build, catalog } = fixture();
    const truck = catalog.trucks[0];
    const wheels = catalog.components.find((part) => part.id === 'wheels');
    if (!truck || truck.sockets.status !== 'known' || wheels?.kind !== 'wheels')
      throw new Error('Fixture missing parts');
    const socket = truck.sockets.value.find((socket) => socket.id === 'wheels');
    if (!socket) throw new Error('Fixture missing socket');
    socket.compatibleComponentIds = unknown;
    socket.excludedComponentIds = unknown;
    wheels.requiredSuspensionIds = unknown;
    expect(validateBuild(build, catalog).status).toBe('unknown');
    expect(codes(build, catalog)).toEqual(
      expect.arrayContaining([
        'fitment-evidence',
        'exclusion-evidence',
        'suspension-evidence',
      ]),
    );
    socket.excludedComponentIds = known(['suspension']);
    expect(validateBuild(build, catalog).status).toBe('incompatible');
    expect(codes(build, catalog)).toContain('socket-exclusion');
  });
  it('does not infer fixed-bed exclusions, and preserves unknown bed evidence for explicit rules', () => {
    const { build, catalog } = fixture();
    build.selections = [
      ...build.selections,
      { socketId: 'addon', componentId: 'addon' },
    ];
    expect(validateBuild(build, catalog).status).toBe('compatible');
    catalog.rulesByTruck['synthetic-ank'] = known([
      { kind: 'forbids-fixed-bed', componentId: 'addon' },
    ]);
    const truck = catalog.trucks[0];
    if (!truck) throw new Error('Fixture missing truck');
    truck.bed = unknown;
    expect(validateBuild(build, catalog).status).toBe('unknown');
    expect(codes(build, catalog)).toContain('bed-evidence');
  });
  it('evaluates known restrictions while preserving incomplete coverage', () => {
    const { build, catalog } = fixture();
    const partial = {
      ...catalog,
      ruleCompletenessByTruck: { 'synthetic-ank': known(false) },
    };
    expect(validateBuild(build, partial).status).toBe('unknown');
    expect(codes(build, partial)).toContain('rule-completeness');
    partial.rulesByTruck['synthetic-ank'] = known([
      { kind: 'forbidden', componentId: 'wheels' },
    ]);
    expect(validateBuild(build, partial).status).toBe('incompatible');
    expect(codes(build, partial)).toContain('forbidden-component');
    expect(compatibilityCatalogSchema.safeParse(partial).success).toBe(true);
  });
  it('treats each dependency group as OR and multiple groups as AND', () => {
    const { build, catalog } = fixture();
    catalog.rulesByTruck['synthetic-ank'] = known([
      {
        kind: 'requires-any',
        componentId: 'wheels',
        requiredComponentIds: ['suspension', 'other'],
      },
    ]);
    expect(validateBuild(build, catalog).status).toBe('compatible');
    catalog.rulesByTruck['synthetic-ank'] = known([
      {
        kind: 'requires-any',
        componentId: 'wheels',
        requiredComponentIds: ['suspension', 'other'],
      },
      {
        kind: 'requires-any',
        componentId: 'wheels',
        requiredComponentIds: ['missing'],
      },
    ]);
    expect(codes(build, catalog)).toContain('missing-dependency');
    catalog.rulesByTruck['synthetic-ank'] = known([
      { kind: 'requires-any', componentId: 'wheels', requiredComponentIds: [] },
    ]);
    expect(compatibilityCatalogSchema.safeParse(catalog).success).toBe(false);
  });
  it('validates rule provenance at ingestion', () => {
    const { catalog } = fixture();
    catalog.rulesByTruck['synthetic-ank'] = {
      status: 'known',
      value: [],
      sourceId: 'missing',
    };
    expect(compatibilityCatalogSchema.safeParse(catalog).success).toBe(false);
  });
});
