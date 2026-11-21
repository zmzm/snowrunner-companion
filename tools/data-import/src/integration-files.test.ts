import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runIntegrationFiles } from './integration-files';
import { sha256Of } from './run';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function scenario() {
  const root = mkdtempSync(join(tmpdir(), 'synthetic-integration-'));
  roots.push(root);
  const csv = 'XML Name,Name\nsynthetic,Synthetic truck\n';
  const xml = '<Truck/>';
  const source = {
    sourceId: 'synthetic-csv',
    sourceUrl: 'https://example.com/authored.csv',
    sourceVersion: sha256Of(csv),
    retrievedAt: '2026-11-21T00:00:00Z',
    usageRights: 'Authored synthetic fixture',
  };
  const manifest = {
    manifestVersion: 1,
    datasetVersion: 'synthetic-v1',
    sources: [source],
    trucks: {
      path: 'trucks.csv',
      sourceId: source.sourceId,
      columns: { xmlName: 'XML Name', displayName: 'Name' },
    },
  };
  const files: Record<string, unknown> = {
    'csv.json': manifest,
    'xml.json': {
      version: 1,
      source: {
        locator: 'synthetic:fixture',
        version: '1',
        retrievedAt: source.retrievedAt,
        usageRights: source.usageRights,
        adapter: 'synthetic',
      },
      entry: 'truck.xml',
      files: [{ path: 'truck.xml', sha256: sha256Of(xml) }],
      links: {},
    },
    'review.json': {
      version: 1,
      datasetVersion: 'synthetic-joined-v1',
      truckId: 'synthetic',
      xmlSourceId: 'synthetic-xml',
      trucks: [],
      components: [],
      rules: [],
      observations: [],
    },
    'config.json': {
      csvManifest: 'csv.json',
      xmlManifest: 'xml.json',
      review: 'review.json',
      outputName: 'synthetic-joined',
    },
  };
  for (const [path, value] of Object.entries(files))
    writeFileSync(join(root, path), JSON.stringify(value));
  writeFileSync(join(root, 'trucks.csv'), csv);
  writeFileSync(join(root, 'truck.xml'), xml);
  return { root, config: join(root, 'config.json'), manifest };
}
describe('local integration file boundaries', () => {
  it('writes development output and preserves an existing run on retry', () => {
    const { root, config } = scenario();
    const output = runIntegrationFiles(config, root);
    const bytes = readFileSync(output.catalogPath, 'utf8');
    expect(JSON.parse(bytes)).toMatchObject({
      developmentOnly: true,
      distributionApproved: false,
    });
    expect(() => runIntegrationFiles(config, root)).toThrow('already exists');
    expect(readFileSync(output.catalogPath, 'utf8')).toBe(bytes);
  });
  it('rejects source traversal without writing a catalog', () => {
    const { root, config, manifest } = scenario();
    manifest.trucks.path = '../outside.csv';
    writeFileSync(join(root, 'csv.json'), JSON.stringify(manifest));
    expect(() => runIntegrationFiles(config, root)).toThrow('escapes');
  });
  it('rejects a symlink that points outside the source directory', () => {
    const { root, config, manifest } = scenario();
    const outside = mkdtempSync(join(tmpdir(), 'synthetic-outside-'));
    roots.push(outside);
    writeFileSync(join(outside, 'outside.csv'), 'authored test content');
    symlinkSync(join(outside, 'outside.csv'), join(root, 'linked.csv'));
    manifest.trucks.path = 'linked.csv';
    writeFileSync(join(root, 'csv.json'), JSON.stringify(manifest));
    expect(() => runIntegrationFiles(config, root)).toThrow('symlink escapes');
  });
  it('preserves an existing report even if its matching catalog is absent', () => {
    const { root, config } = scenario();
    mkdirSync(join(root, 'data/reports'), { recursive: true });
    const path = join(root, 'data/reports/synthetic-joined.json');
    writeFileSync(path, 'operator notes');
    expect(() => runIntegrationFiles(config, root)).toThrow('already exists');
    expect(readFileSync(path, 'utf8')).toBe('operator notes');
  });
});
