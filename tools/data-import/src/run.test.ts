import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { datasetSchema } from '@snowrunner/game-data';
import { parseManifest } from './manifest';
import type { Component, Truck } from '@snowrunner/domain';
import {
  ImportHashMismatchError,
  ImportManifestError,
  runImport,
  sha256Of,
} from './run';

// End-to-end run against the committed synthetic SR!NFO-shaped fixture.
// The fixture is authored synthetic data; nothing here validates game facts.
const fixtureDirectory = fileURLToPath(
  new URL('../../../fixtures/synthetic/srnfo/', import.meta.url),
);

function loadFixture(): { manifest: unknown; files: Map<string, string> } {
  const manifest = parseManifest(
    JSON.parse(readFileSync(`${fixtureDirectory}manifest.json`, 'utf8')),
  );
  const files = new Map<string, string>();
  for (const input of [
    manifest.trucks,
    manifest.engines,
    manifest.gearboxes,
    manifest.wheels,
    manifest.addons,
  ]) {
    if (input !== undefined)
      files.set(
        input.path,
        readFileSync(`${fixtureDirectory}${input.path}`, 'utf8'),
      );
  }
  return { manifest, files };
}

function findTruck(dataset: { trucks: Truck[] }, id: string): Truck {
  const truck = dataset.trucks.find((entry) => entry.id === id);
  if (truck === undefined) throw new Error(`truck ${id} missing`);
  return truck;
}

function findComponent(
  dataset: { components: Component[] },
  id: string,
): Component {
  const component = dataset.components.find((entry) => entry.id === id);
  if (component === undefined) throw new Error(`component ${id} missing`);
  return component;
}

describe('runImport end-to-end on the synthetic fixture', () => {
  it('produces a dataset that satisfies the versioned dataset contract', () => {
    const { manifest, files } = loadFixture();
    const result = runImport(manifest, files);
    expect(result.ok).toBe(true);
    expect(result.report.datasetValidation).toEqual({ ok: true });
    if (result.datasetJson === null) throw new Error('dataset missing');
    const dataset = datasetSchema.parse(JSON.parse(result.datasetJson));
    expect(dataset.trucks.map((truck) => truck.id)).toEqual([
      'synthetic-mk38',
      'synthetic-hauler',
      'synthetic-scout',
    ]);
    expect(dataset.sources).toHaveLength(5);
    expect(result.report.inputs.map((input) => input.sha256)).toContain(
      sha256Of(files.get('trucks.csv') ?? ''),
    );
  });

  it('normalizes the explicitly synthetic ANK-MK38-shaped case without inventing facts', () => {
    const { manifest, files } = loadFixture();
    const result = runImport(manifest, files);
    if (!result.ok || result.datasetJson === null)
      throw new Error('import failed');
    const dataset = datasetSchema.parse(JSON.parse(result.datasetJson));
    const mk38 = findTruck(dataset, 'synthetic-mk38');
    expect(mk38.bed).toEqual({
      status: 'known',
      value: { kind: 'fixed', cargoSlots: 2 },
      sourceId: 'synthetic-srnfo-trucks',
    });
    expect(mk38.drivetrain.awd).toEqual({
      status: 'known',
      value: 'always-on',
      sourceId: 'synthetic-srnfo-trucks',
    });
    expect(mk38.availability.unlock).toEqual({
      status: 'known',
      value: { kind: 'available' },
      sourceId: 'synthetic-srnfo-trucks',
    });
    expect(mk38.availability.dlcIds.status).toBe('unknown');
    expect(mk38.sockets.status).toBe('unknown');

    const hauler = findTruck(dataset, 'synthetic-hauler');
    expect(hauler.availability.unlock).toEqual({
      status: 'known',
      value: { kind: 'rank', rank: 4 },
      sourceId: 'synthetic-srnfo-trucks',
    });
    expect(hauler.availability.dlcIds).toEqual({
      status: 'known',
      value: ['Synth DLC'],
      sourceId: 'synthetic-srnfo-trucks',
    });
    expect(hauler.bed).toEqual({
      status: 'known',
      value: { kind: 'addon', socketId: 'frame_addon' },
      sourceId: 'synthetic-srnfo-trucks',
    });

    const scout = findTruck(dataset, 'synthetic-scout');
    expect(scout.availability.unlock).toEqual({
      status: 'known',
      value: { kind: 'exploration', regionId: 'synth_region' },
      sourceId: 'synthetic-srnfo-trucks',
    });
    expect(scout.bed.status).toBe('unknown');

    const engine = findComponent(dataset, 'engine:synth-v8-fixture');
    if (engine.kind !== 'engine') throw new Error('wrong kind');
    expect(engine.torqueNm).toMatchObject({
      status: 'unknown',
      reason: expect.stringContaining('units unverified'),
    });
    const gearbox = findComponent(dataset, 'gearbox:synth-offroad-fixture');
    if (gearbox.kind !== 'gearbox') throw new Error('wrong kind');
    expect(gearbox.gears).toEqual({
      status: 'known',
      value: 5,
      sourceId: 'synthetic-srnfo-gearboxes',
    });
    const wheels = findComponent(dataset, 'wheels:synth-mud-fixture');
    if (wheels.kind !== 'wheels') throw new Error('wrong kind');
    expect(wheels.diameterInches).toEqual({
      status: 'known',
      value: 41,
      sourceId: 'synthetic-srnfo-wheels',
    });
    expect(wheels.requiredSuspensionIds.status).toBe('unknown');
    const addon = findComponent(dataset, 'addon:synth-sideboard-fixture');
    if (addon.kind !== 'addon') throw new Error('wrong kind');
    expect(addon.equipment).toEqual({
      status: 'known',
      value: ['SYNTH crane', 'SYNTH spare wheel'],
      sourceId: 'synthetic-srnfo-addons',
    });
    expect(addon.cargoSlots).toEqual({
      status: 'known',
      value: 2,
      sourceId: 'synthetic-srnfo-addons',
    });
  });

  it('is idempotent: identical inputs yield byte-identical outputs', () => {
    const { manifest, files } = loadFixture();
    const first = runImport(manifest, files);
    const second = runImport(manifest, files);
    expect(second.datasetJson).toBe(first.datasetJson);
    expect(second.reportJson).toBe(first.reportJson);
  });

  it('fails closed when file bytes do not match the recorded source hash', () => {
    const { manifest, files } = loadFixture();
    const tampered = new Map(files);
    tampered.set(
      'trucks.csv',
      `${files.get('trucks.csv') ?? ''}\nsynthetic_extra,Extra,,,,,,\n`,
    );
    expect(() => runImport(manifest, tampered)).toThrow(
      ImportHashMismatchError,
    );
  });

  it('rejects invalid manifests with a formatted error', () => {
    expect(() => runImport({ manifestVersion: 1 }, new Map())).toThrow(
      ImportManifestError,
    );
    expect(() => runImport({}, new Map())).toThrow(/Invalid import manifest/);
  });

  it('records unmapped columns from the fixture for operator review', () => {
    const { manifest, files } = loadFixture();
    const result = runImport(manifest, files);
    const trucksUnmapped = result.report.unmappedColumns.find(
      (entry) => entry.file === 'trucks.csv',
    );
    if (trucksUnmapped === undefined) throw new Error('unmapped entry missing');
    expect(trucksUnmapped.columns).toEqual(['Price', 'Mass', 'Fuel']);
    const enginesUnmapped = result.report.unmappedColumns.find(
      (entry) => entry.file === 'engines.csv',
    );
    if (enginesUnmapped === undefined)
      throw new Error('unmapped entry missing');
    expect(enginesUnmapped.columns).toEqual(['Max Torque']);
  });
});
