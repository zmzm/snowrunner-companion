import { describe, expect, it } from 'vitest';
import { manifestSchema } from './manifest';

const sha256 = `sha256:${'a'.repeat(64)}`;

function source(
  sourceId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    sourceId,
    sourceUrl: `https://example.com/${sourceId}.csv`,
    sourceVersion: sha256,
    retrievedAt: '2026-11-13T00:00:00.000Z',
    usageRights: 'Authored synthetic fixture; no game content',
    ...overrides,
  };
}

function trucksTab(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    path: 'trucks.csv',
    sourceId: 'src-trucks',
    columns: { xmlName: 'XML Name' },
    ...overrides,
  };
}

function baseManifest(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    manifestVersion: 1,
    datasetVersion: 'synthetic-v1',
    sources: [source('src-trucks')],
    trucks: trucksTab(),
    ...overrides,
  };
}

describe('import manifest contract', () => {
  it('accepts a complete multi-tab manifest', () => {
    const result = manifestSchema.safeParse(
      baseManifest({
        engines: {
          path: 'engines.csv',
          sourceId: 'src-engines',
          columns: {
            name: 'Engine',
            torque: { column: 'Torque', unit: 'unverified' },
          },
        },
        sources: [source('src-trucks'), source('src-engines')],
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.datasetVersion).toBe('synthetic-v1');
  });

  it.each([
    [
      'missing identity column mapping',
      baseManifest({ trucks: trucksTab({ columns: {} }) }),
    ],
    [
      'invalid torque unit',
      baseManifest({
        trucks: undefined,
        engines: {
          path: 'engines.csv',
          sourceId: 'src-trucks',
          columns: { name: 'Engine', torque: { column: 'Torque', unit: 'kg' } },
        },
      }),
    ],
    [
      'unknown file source',
      baseManifest({ trucks: trucksTab({ sourceId: 'src-ghost' }) }),
    ],
    [
      'source reused by two files',
      baseManifest({
        engines: {
          path: 'engines.csv',
          sourceId: 'src-trucks',
          columns: { name: 'Engine' },
        },
      }),
    ],
    ['no entity tabs at all', baseManifest({ trucks: undefined })],
    [
      'non-hash source version',
      baseManifest({
        sources: [source('src-trucks', { sourceVersion: 'version-1' })],
      }),
    ],
    [
      'unlinked source',
      baseManifest({ sources: [source('src-trucks'), source('src-unlinked')] }),
    ],
    [
      'blank token key',
      baseManifest({
        trucks: trucksTab({
          columns: {
            xmlName: 'XML Name',
            awd: { column: 'AWD', tokens: { '': 'always-on' } },
          },
        }),
      }),
    ],
    [
      'invalid drivetrain token value',
      baseManifest({
        trucks: trucksTab({
          columns: {
            xmlName: 'XML Name',
            awd: { column: 'AWD', tokens: { Always: 'sometimes' } },
          },
        }),
      }),
    ],
    [
      'negative rank token',
      baseManifest({
        trucks: trucksTab({
          columns: {
            xmlName: 'XML Name',
            unlock: {
              column: 'Unlock',
              tokens: { 'Rank -1': { kind: 'rank', rank: -1 } },
            },
          },
        }),
      }),
    ],
    ['unknown manifest version', baseManifest({ manifestVersion: 2 })],
    ['unexpected top-level field', baseManifest({ surprise: true })],
  ])('rejects %s', (_name, manifest) => {
    expect(manifestSchema.safeParse(manifest).success).toBe(false);
  });
});
