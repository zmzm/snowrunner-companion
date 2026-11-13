import { describe, expect, it } from 'vitest';
import { canonicalizeId } from './canonicalize';
import { manifestSchema, type Manifest } from './manifest';
import { normalizeImport } from './normalize';
import { ImportFormatError } from './errors';
import type { ImportFile } from './report';

// All CSV rows below are authored synthetic fixtures. Values are NOT verified game facts.
const sha256 = `sha256:${'b'.repeat(64)}`;

function trucksManifest(
  columns: Record<string, unknown>,
  path = 'trucks.csv',
): Manifest {
  return manifestSchema.parse({
    manifestVersion: 1,
    datasetVersion: 'synthetic-v1',
    sources: [
      {
        sourceId: 'src-trucks',
        sourceUrl: 'https://example.com/synthetic-trucks.csv',
        sourceVersion: sha256,
        retrievedAt: '2026-11-13T00:00:00.000Z',
        usageRights: 'Authored synthetic fixture; no game content',
      },
    ],
    trucks: { path, sourceId: 'src-trucks', columns },
  });
}

function runTrucks(columns: Record<string, unknown>, csv: string) {
  const manifest = trucksManifest(columns);
  const files = new Map<string, ImportFile>([
    ['trucks.csv', { content: csv, sha256 }],
  ]);
  return normalizeImport(manifest, files);
}

const fullColumns = {
  xmlName: 'XML Name',
  displayName: 'Display Name',
  unlock: {
    column: 'Unlock',
    tokens: {
      Available: { kind: 'available' },
      'Rank 4': { kind: 'rank', rank: 4 },
    },
  },
  dlcIds: { column: 'DLC', separator: ',' },
  awd: {
    column: 'AWD',
    tokens: {
      Always: 'always-on',
      Switchable: 'switchable',
      Never: 'unavailable',
    },
  },
  differentialLock: { column: 'Diff Lock', tokens: { Always: 'always-on' } },
  bedKind: {
    column: 'Bed',
    tokens: { Fixed: 'fixed', Addon: 'addon', None: 'none' },
  },
  bedCargoSlots: { column: 'Bed Cargo Slots' },
  bedSocketId: { column: 'Bed Socket' },
};

function findTruck(result: ReturnType<typeof normalizeImport>, id: string) {
  const truck = result.trucks.find((entry) => entry.id === id);
  if (truck === undefined) throw new Error(`truck ${id} not found`);
  return truck;
}

const truckHeader =
  'XML Name,Display Name,Unlock,DLC,AWD,Diff Lock,Bed,Bed Cargo Slots,Bed Socket';

function truckRow(values: {
  xmlName: string;
  displayName?: string;
  unlock?: string;
  dlc?: string;
  awd?: string;
  differentialLock?: string;
  bed?: string;
  bedCargoSlots?: string;
  bedSocket?: string;
}): string {
  const cells = [
    values.xmlName,
    values.displayName ?? '',
    values.unlock ?? '',
    values.dlc ?? '',
    values.awd ?? '',
    values.differentialLock ?? '',
    values.bed ?? '',
    values.bedCargoSlots ?? '',
    values.bedSocket ?? '',
  ];
  return cells
    .map((cell) => (cell.includes(',') ? `"${cell}"` : cell))
    .join(',');
}

describe('canonical identifiers', () => {
  it('normalizes source names to stable canonical IDs', () => {
    expect(canonicalizeId('ank_mk38')).toBe('ank-mk38');
    expect(canonicalizeId('ANK  MK38 (Civilian)')).toBe('ank-mk38-civilian');
    expect(canonicalizeId('  Loadstar 1700  ')).toBe('loadstar-1700');
  });
});

describe('normalizeImport', () => {
  it('maps explicit tokens, lists, and counts to known facts with provenance', () => {
    const csv = [
      'XML Name,Display Name,Unlock,DLC,AWD,Diff Lock,Bed,Bed Cargo Slots,Bed Socket',
      'synthetic_mk38,SYNTH MK38 (fixture),Available,Synth DLC,Always,Always,Fixed,2,',
    ].join('\n');
    const result = runTrucks(fullColumns, csv);
    const truck = findTruck(result, 'synthetic-mk38');
    expect(result.report).not.toHaveProperty('datasetValidation');
    expect(truck.name).toBe('SYNTH MK38 (fixture)');
    expect(truck.availability.unlock).toEqual({
      status: 'known',
      value: { kind: 'available' },
      sourceId: 'src-trucks',
    });
    expect(truck.availability.dlcIds).toEqual({
      status: 'known',
      value: ['Synth DLC'],
      sourceId: 'src-trucks',
    });
    expect(truck.drivetrain.awd).toEqual({
      status: 'known',
      value: 'always-on',
      sourceId: 'src-trucks',
    });
    expect(truck.bed).toEqual({
      status: 'known',
      value: { kind: 'fixed', cargoSlots: 2 },
      sourceId: 'src-trucks',
    });
    expect(result.report.entities.trucks[0]?.fields.awd).toEqual({
      status: 'known',
      detail: 'token "Always" from column "AWD"',
    });
  });

  it('keeps blank cells and unmapped fields unknown instead of inventing values', () => {
    const csv = [
      truckHeader,
      truckRow({ xmlName: 'synthetic_ghost', displayName: 'SYNTH Ghost' }),
    ].join('\n');
    const result = runTrucks(fullColumns, csv);
    const truck = findTruck(result, 'synthetic-ghost');
    expect(truck.name).toBe('SYNTH Ghost');
    expect(truck.availability.unlock.status).toBe('unknown');
    expect(truck.availability.dlcIds.status).toBe('unknown');
    expect(truck.drivetrain.awd.status).toBe('unknown');
    expect(truck.bed.status).toBe('unknown');
    expect(truck.sockets.status).toBe('unknown');
    expect(truck.sockets).toMatchObject({
      status: 'unknown',
      reason: expect.stringContaining('resolved game XML'),
    });
  });

  it('treats a missing identity cell as a discarded row, not an empty truck', () => {
    const csv = ['XML Name', 'synthetic_one', '   '].join('\n');
    const result = runTrucks({ xmlName: 'XML Name' }, csv);
    expect(result.trucks).toHaveLength(1);
    expect(result.report.discardedRows).toEqual([
      { file: 'trucks.csv', row: 3, reason: 'missing XML Name' },
    ]);
  });

  it('reports unrecognized tokens and non-numeric counts as unknown', () => {
    const csv = [
      truckHeader,
      truckRow({
        xmlName: 'synthetic_odd',
        awd: 'Sometimes',
        bed: 'Fixed',
        bedCargoSlots: 'many',
      }),
    ].join('\n');
    const result = runTrucks(fullColumns, csv);
    const truck = findTruck(result, 'synthetic-odd');
    expect(truck.drivetrain.awd).toMatchObject({
      status: 'unknown',
      reason: expect.stringContaining('unrecognized awd value "Sometimes"'),
    });
    expect(truck.bed).toMatchObject({
      status: 'unknown',
      reason: expect.stringContaining('cargo slot count unresolved'),
    });
    expect(result.report.entities.trucks[0]?.fields.awd).toEqual({
      status: 'unknown',
      detail: 'unrecognized token "Sometimes"',
    });
  });

  it('resolves an add-on bed only when socket evidence exists', () => {
    const csv = [
      truckHeader,
      truckRow({
        xmlName: 'synthetic_with_socket',
        bed: 'Addon',
        bedSocket: 'frame_socket',
      }),
      truckRow({ xmlName: 'synthetic_without_socket', bed: 'Addon' }),
    ].join('\n');
    const result = runTrucks(fullColumns, csv);
    expect(findTruck(result, 'synthetic-with-socket').bed).toEqual({
      status: 'known',
      value: { kind: 'addon', socketId: 'frame_socket' },
      sourceId: 'src-trucks',
    });
    expect(findTruck(result, 'synthetic-without-socket').bed).toMatchObject({
      status: 'unknown',
      reason: expect.stringContaining('socket evidence is missing'),
    });
  });

  it('deduplicates agreeing rows and turns disagreeing fields into unknown with a report entry', () => {
    const csv = [
      truckHeader,
      truckRow({
        xmlName: 'synthetic_twin',
        awd: 'Always',
        differentialLock: 'Always',
      }),
      truckRow({
        xmlName: 'synthetic_twin',
        awd: 'Always',
        differentialLock: 'Switchable',
      }),
      truckRow({
        xmlName: 'synthetic_twin',
        awd: 'Always',
        differentialLock: 'Always',
      }),
    ].join('\n');
    const result = runTrucks(fullColumns, csv);
    expect(result.trucks).toHaveLength(1);
    const truck = findTruck(result, 'synthetic-twin');
    expect(truck.drivetrain.awd).toMatchObject({
      status: 'known',
      value: 'always-on',
    });
    expect(truck.drivetrain.differentialLock.status).toBe('unknown');
    expect(result.report.inconsistencies).toEqual([
      {
        file: 'trucks.csv',
        rows: [2, 3],
        field: 'differentialLock',
        values: ['Always', 'Switchable'],
        resolution: expect.stringContaining('unknown'),
      },
    ]);
  });

  it('records identity-name disagreements while keeping first appearance', () => {
    const csv = [
      truckHeader,
      truckRow({ xmlName: 'SYNTH Twin (fixture)', awd: 'Always' }),
      truckRow({ xmlName: 'synth twin fixture', awd: 'Always' }),
    ].join('\n');
    const result = runTrucks(fullColumns, csv);
    expect(result.trucks).toHaveLength(1);
    expect(result.trucks[0]?.name).toBe('SYNTH Twin (fixture)');
    expect(result.report.inconsistencies[0]?.field).toBe('name');
    expect(result.report.inconsistencies[0]?.values).toEqual([
      'SYNTH Twin (fixture)',
      'synth twin fixture',
    ]);
  });

  it('records unmapped columns instead of silently dropping them', () => {
    const csv = ['XML Name,Price,Mass', 'synthetic_mk38,1000,5000'].join('\n');
    const result = runTrucks({ xmlName: 'XML Name' }, csv);
    expect(result.report.unmappedColumns).toEqual([
      { file: 'trucks.csv', columns: ['Price', 'Mass'] },
    ]);
  });

  it('keeps units explicit: unverified units never become a known value', () => {
    const manifest = manifestSchema.parse({
      manifestVersion: 1,
      datasetVersion: 'synthetic-v1',
      sources: [
        {
          sourceId: 'src-engines',
          sourceUrl: 'https://example.com/synthetic-engines.csv',
          sourceVersion: sha256,
          retrievedAt: '2026-11-13T00:00:00.000Z',
          usageRights: 'Authored synthetic fixture; no game content',
        },
      ],
      engines: {
        path: 'engines.csv',
        sourceId: 'src-engines',
        columns: {
          name: 'Engine',
          torque: { column: 'Torque', unit: 'unverified' },
        },
      },
    });
    const csv =
      'Engine,Torque\nSYNTH V8 (fixture),90000\nSYNTH Empty (fixture),';
    const result = normalizeImport(
      manifest,
      new Map([['engines.csv', { content: csv, sha256 }]]),
    );
    const engine = result.components[0];
    if (engine === undefined || engine.kind !== 'engine')
      throw new Error('engine not found');
    expect(engine.torqueNm).toMatchObject({
      status: 'unknown',
      reason: expect.stringContaining('units unverified'),
    });
    expect(result.report.entities.components[0]?.fields.torqueNm).toEqual({
      status: 'unknown',
      detail: 'units unverified',
    });
  });

  it('accepts known measured values only when the manifest declares the unit', () => {
    const manifest = manifestSchema.parse({
      manifestVersion: 1,
      datasetVersion: 'synthetic-v1',
      sources: [
        {
          sourceId: 'src-wheels',
          sourceUrl: 'https://example.com/synthetic-wheels.csv',
          sourceVersion: sha256,
          retrievedAt: '2026-11-13T00:00:00.000Z',
          usageRights: 'Authored synthetic fixture; no game content',
        },
      ],
      wheels: {
        path: 'wheels.csv',
        sourceId: 'src-wheels',
        columns: {
          name: 'Wheel',
          diameter: { column: 'Diameter', unit: 'inches' },
        },
      },
    });
    const csv =
      'Wheel,Diameter,Requires Suspension\nSYNTH Allterrain (fixture),39,SYNTH suspension\nSYNTH Odd (fixture),thirty-nine,';
    const result = normalizeImport(
      manifest,
      new Map([['wheels.csv', { content: csv, sha256 }]]),
    );
    const knownWheel = result.components[0];
    if (knownWheel === undefined || knownWheel.kind !== 'wheels')
      throw new Error('wheel not found');
    expect(knownWheel.diameterInches).toEqual({
      status: 'known',
      value: 39,
      sourceId: 'src-wheels',
    });
    expect(knownWheel.requiredSuspensionIds.status).toBe('unknown');
    const oddWheel = result.components[1];
    if (oddWheel === undefined || oddWheel.kind !== 'wheels')
      throw new Error('wheel not found');
    expect(oddWheel.diameterInches).toMatchObject({
      status: 'unknown',
      reason: expect.stringContaining('unusable diameter value "thirty-nine"'),
    });
  });

  it('fails closed on duplicate headers and missing mapped columns', () => {
    expect(() =>
      runTrucks({ xmlName: 'XML Name' }, 'XML Name,XML Name\nsynthetic_x,1'),
    ).toThrow(ImportFormatError);
    expect(() =>
      runTrucks({ xmlName: 'XML Name' }, 'Name\nsynthetic_x'),
    ).toThrow(/mapped column\(s\) "XML Name"/);
  });

  it('is deterministic: identical inputs produce identical outputs', () => {
    const csv = [
      'XML Name,Display Name,Unlock,DLC,AWD,Diff Lock,Bed,Bed Cargo Slots,Bed Socket',
      'synthetic_mk38,SYNTH MK38 (fixture),Available,,Always,Always,Fixed,2,',
    ].join('\n');
    const first = runTrucks(fullColumns, csv);
    const second = runTrucks(fullColumns, csv);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
