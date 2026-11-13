import { describe, expect, it } from 'vitest';
import type {
  Component,
  SourcedValue,
  Truck,
  TruckBuild,
} from '@snowrunner/domain';
import {
  componentSchema,
  datasetSchema,
  requirementSchema,
  sourcedValueSchema,
  truckBuildSchema,
  truckSchema,
} from './index';
import { z } from 'zod';

// Authored synthetic ANK-shaped scenario. Values are NOT verified game facts.
const known = <T>(value: T): SourcedValue<T> => ({
  status: 'known',
  value,
  sourceId: 'synthetic',
});
const unknown = {
  status: 'unknown',
  reason: 'No verified game evidence',
} satisfies SourcedValue<never>;
const availability = {
  unlock: known({ kind: 'available' } satisfies { kind: 'available' }),
  dlcIds: known<string[]>([]),
};
const truck: Truck = {
  id: 'synthetic-ank-mk38',
  name: 'ANK MK38 — synthetic schema fixture',
  availability,
  drivetrain: { awd: unknown, differentialLock: unknown },
  bed: known({ kind: 'fixed', cargoSlots: 2 }),
  sockets: known([
    {
      id: 'suspension',
      kind: 'suspension',
      compatibleComponentIds: known(['synthetic-lift']),
      defaultComponentId: known('synthetic-lift'),
      excludedComponentIds: unknown,
    },
  ]),
};
const components: Component[] = [
  {
    id: 'synthetic-engine',
    name: 'Test engine',
    availability,
    kind: 'engine',
    torqueNm: unknown,
  },
  {
    id: 'synthetic-gearbox',
    name: 'Test gearbox',
    availability,
    kind: 'gearbox',
    gears: known(3),
  },
  {
    id: 'synthetic-lift',
    name: 'Test lift',
    availability,
    kind: 'suspension',
    liftMm: known(25),
  },
  {
    id: 'synthetic-wheels',
    name: 'Test wheels',
    availability,
    kind: 'wheels',
    diameterInches: known(40),
    requiredSuspensionIds: known(['synthetic-lift']),
  },
  {
    id: 'synthetic-winch',
    name: 'Test winch',
    availability,
    kind: 'winch',
    autonomous: unknown,
  },
  {
    id: 'synthetic-addon',
    name: 'Test addon',
    availability,
    kind: 'addon',
    cargoSlots: known(0),
    equipment: known(['test-crane']),
  },
];
const build: TruckBuild = {
  schemaVersion: 1,
  datasetVersion: 'synthetic-v1',
  id: 'test-build',
  name: 'Test',
  truckId: truck.id,
  selections: [{ socketId: 'suspension', componentId: 'synthetic-lift' }],
};
const dataset = {
  schemaVersion: 1,
  datasetVersion: 'synthetic-v1',
  trucks: [truck],
  components,
  sources: [
    {
      sourceId: 'synthetic',
      sourceUrl: 'https://example.com/synthetic-fixture',
      sourceVersion: 'authored-v1',
      retrievedAt: '2026-11-13T00:00:00Z',
      usageRights: 'Authored synthetic fixture; no game content',
    },
  ],
};

describe('normalized entity contracts', () => {
  it('accepts a versioned synthetic ANK scenario and all component variants', () => {
    expect(datasetSchema.parse(dataset)).toEqual(dataset);
    expect(truckBuildSchema.parse(build)).toEqual(build);
    for (const component of components)
      expect(componentSchema.parse(component)).toEqual(component);
  });
  it('models removable beds independently of fixed beds', () => {
    expect(
      truckSchema.safeParse({
        ...truck,
        bed: known({ kind: 'addon', socketId: 'frame' }),
      }).success,
    ).toBe(true);
    expect(
      truckSchema.safeParse({
        ...truck,
        bed: known({ kind: 'fixed', cargoSlots: 2, socketId: 'frame' }),
      }).success,
    ).toBe(false);
  });
  it('preserves unknowns and conflicts without supplying defaults', () => {
    const schema = sourcedValueSchema(z.number());
    expect(schema.parse(unknown)).toEqual(unknown);
    expect(schema.safeParse({ status: 'known', value: 0 }).success).toBe(false);
    expect(schema.safeParse({ status: 'unknown', reason: '' }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({
        status: 'conflict',
        reason: 'Disagreement',
        sourceIds: ['a', 'b'],
      }).success,
    ).toBe(true);
    for (const sourceIds of [[], ['a'], ['a', 'a']]) {
      expect(
        schema.safeParse({
          status: 'conflict',
          reason: 'Disagreement',
          sourceIds,
        }).success,
      ).toBe(false);
    }
  });
  it('requires explicit availability and drivetrain evidence', () => {
    expect(truckSchema.safeParse({ ...truck, availability: {} }).success).toBe(
      false,
    );
    expect(
      truckSchema.safeParse({ ...truck, drivetrain: { awd: true } }).success,
    ).toBe(false);
    expect(
      truckSchema.safeParse({
        ...truck,
        availability: {
          ...availability,
          unlock: known({ kind: 'rank', rank: -1 }),
        },
      }).success,
    ).toBe(false);
    expect(
      truckSchema.safeParse({
        ...truck,
        availability: {
          ...availability,
          unlock: known({ kind: 'exploration', regionId: 'test-region' }),
        },
      }).success,
    ).toBe(true);
  });
  it('rejects missing wheel dependencies and invalid numeric units with useful paths', () => {
    const result = componentSchema.safeParse({
      id: 'test',
      name: 'Test',
      availability,
      kind: 'wheels',
      diameterInches: known(-4),
      requiredSuspensionIds: unknown,
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.path)).toContainEqual([
        'diameterInches',
        'value',
      ]);
    expect(
      componentSchema.safeParse({
        id: 'test',
        name: 'Test',
        availability,
        kind: 'wheels',
        diameterInches: known(40),
      }).success,
    ).toBe(false);
    expect(
      componentSchema.safeParse({ ...components[0], kind: 'mystery' }).success,
    ).toBe(false);
  });
  it('rejects duplicate socket selections, unknown save versions and blank dataset versions', () => {
    expect(
      truckBuildSchema.safeParse({
        ...build,
        selections: [...build.selections, ...build.selections],
      }).success,
    ).toBe(false);
    expect(
      truckBuildSchema.safeParse({ ...build, schemaVersion: 2 }).success,
    ).toBe(false);
    expect(
      truckBuildSchema.safeParse({ ...build, datasetVersion: ' ' }).success,
    ).toBe(false);
  });
  it('requires provenance references to resolve and IDs to be unique', () => {
    expect(
      datasetSchema.safeParse({
        ...dataset,
        sources: [{ ...dataset.sources[0], sourceId: 'other' }],
      }).success,
    ).toBe(false);
    expect(
      datasetSchema.safeParse({ ...dataset, trucks: [truck, truck] }).success,
    ).toBe(false);
    expect(
      datasetSchema.safeParse({
        ...dataset,
        sources: [...dataset.sources, ...dataset.sources],
      }).success,
    ).toBe(false);
  });
  it('distinguishes trailer cargo from onboard cargo and validates requirements', () => {
    for (const location of ['on-truck', 'trailer'])
      expect(
        requirementSchema.safeParse({
          kind: 'cargo',
          location,
          minimumSlots: 2,
        }).success,
      ).toBe(true);
    for (const minimumSlots of [-1, 1.5, '2'])
      expect(
        requirementSchema.safeParse({
          kind: 'cargo',
          location: 'on-truck',
          minimumSlots,
        }).success,
      ).toBe(false);
    expect(
      requirementSchema.safeParse({ kind: 'cargo', minimumSlots: 2 }).success,
    ).toBe(false);
    for (const input of [
      { kind: 'awd', required: true },
      { kind: 'equipment', equipmentId: 'test-crane' },
      { kind: 'terrain', terrainId: 'test-mud' },
    ])
      expect(requirementSchema.safeParse(input).success).toBe(true);
  });
});
