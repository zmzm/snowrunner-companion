import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import { datasetSchema } from '@snowrunner/game-data';
import { sha256Of } from './run';

const cli = fileURLToPath(new URL('./cli.ts', import.meta.url));
const fixture = fileURLToPath(
  new URL('../../../fixtures/synthetic/srnfo/manifest.json', import.meta.url),
);
const directories: string[] = [];

function workspace(): string {
  const directory = mkdtempSync(join(tmpdir(), 'snowrunner-cli-'));
  directories.push(directory);
  return directory;
}

function invoke(args: string[]) {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', cli, ...args],
    { encoding: 'utf8' },
  );
  if (result.error) throw result.error;
  return result;
}

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

it('rejects incomplete arguments and displays help', () => {
  const invalid = invoke(['--manifest']);
  expect(invalid.status).toBe(1);
  expect(invalid.stderr).toContain('Unknown or incomplete argument');
  const help = invoke(['--help']);
  expect(help.status).toBe(0);
  expect(help.stdout).toContain('Usage:');
});

it('validates a manifest before attempting to read referenced inputs', () => {
  const directory = workspace();
  const manifest = join(directory, 'invalid.json');
  writeFileSync(manifest, JSON.stringify({ trucks: { path: 'missing.csv' } }));
  const result = invoke(['--manifest', manifest]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Invalid import manifest');
  expect(result.stderr).not.toContain('Cannot read input file');
});

it('writes a validated dataset and matching report using the documented pnpm command', () => {
  const directory = workspace();
  const output = join(directory, 'dataset.json');
  const report = join(directory, 'report.json');
  const result = spawnSync(
    'pnpm',
    [
      'import:srnfo',
      '--',
      '--manifest',
      fixture,
      '--out',
      output,
      '--report',
      report,
    ],
    { encoding: 'utf8' },
  );
  if (result.error) throw result.error;
  expect(result.status, result.stderr).toBe(0);
  const dataset = datasetSchema.parse(JSON.parse(readFileSync(output, 'utf8')));
  expect(dataset.trucks).toHaveLength(3);
  expect(JSON.parse(readFileSync(report, 'utf8'))).toMatchObject({
    datasetValidation: { ok: true },
  });
});

it('writes a failure report and no dataset when normalized data violates the dataset contract', () => {
  const directory = workspace();
  // Authored synthetic fixture: an empty canonical identifier is invalid.
  const csv = 'Name\n!!!\n';
  writeFileSync(join(directory, 'trucks.csv'), csv);
  const manifest = join(directory, 'manifest.json');
  writeFileSync(
    manifest,
    JSON.stringify({
      manifestVersion: 1,
      datasetVersion: 'synthetic-invalid',
      sources: [
        {
          sourceId: 'synthetic',
          sourceUrl: 'https://example.com/synthetic.csv',
          sourceVersion: sha256Of(csv),
          retrievedAt: '2026-11-13T00:00:00.000Z',
          usageRights: 'Authored synthetic fixture',
        },
      ],
      trucks: {
        path: 'trucks.csv',
        sourceId: 'synthetic',
        columns: { xmlName: 'Name' },
      },
    }),
  );
  const output = join(directory, 'dataset.json');
  const report = join(directory, 'report.json');
  const result = invoke([
    '--manifest',
    manifest,
    '--out',
    output,
    '--report',
    report,
  ]);
  expect(result.status).toBe(1);
  expect(existsSync(output)).toBe(false);
  expect(JSON.parse(readFileSync(report, 'utf8'))).toMatchObject({
    datasetValidation: {
      ok: false,
      issues: expect.arrayContaining([expect.stringContaining('trucks.0.id')]),
    },
  });
});
