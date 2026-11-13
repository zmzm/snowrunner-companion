import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runValidatedImport } from './run';
import { parseManifest } from './manifest';

interface CliOptions {
  manifestPath: string;
  outPath: string;
  reportPath: string;
}

const usage = `Usage: pnpm import:srnfo -- --manifest <manifest.json> [--out <dataset.json>] [--report <report.json>]

Reads locally supplied CSV files referenced by the manifest, verifies source
hashes, normalizes rows into the versioned dataset contract and writes a
deterministic validation report. Performs no network access.

Defaults:
  --out     data/normalized/srnfo-dataset.json (ignored directory)
  --report  data/reports/srnfo-import-report.json (ignored directory)`;

function parseArgs(argv: readonly string[]): CliOptions {
  const options: Partial<CliOptions> = {};
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === '--') continue;
    const value = argv[index + 1];
    if (
      (flag === '--manifest' || flag === '--out' || flag === '--report') &&
      value !== undefined
    ) {
      if (flag === '--manifest') options.manifestPath = value;
      else if (flag === '--out') options.outPath = value;
      else options.reportPath = value;
      index++;
      continue;
    }
    if (flag === '--help' || flag === '-h') {
      console.log(usage);
      process.exit(0);
    }
    throw new Error(`Unknown or incomplete argument "${flag}".\n${usage}`);
  }
  if (options.manifestPath === undefined)
    throw new Error(`--manifest is required.\n${usage}`);
  return {
    manifestPath: options.manifestPath,
    outPath: options.outPath ?? 'data/normalized/srnfo-dataset.json',
    reportPath: options.reportPath ?? 'data/reports/srnfo-import-report.json',
  };
}

function writeFileAtomic(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, content, 'utf8');
  renameSync(temporary, path);
}

function main(): number {
  const args = process.argv.slice(2);
  const options = parseArgs(args[0] === '--' ? args.slice(1) : args);
  let manifestText: string;
  try {
    manifestText = readFileSync(options.manifestPath, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read manifest "${options.manifestPath}"`, {
      cause: error,
    });
  }
  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(manifestText);
  } catch (error) {
    throw new Error(`Manifest is not valid JSON: ${String(error)}`, {
      cause: error,
    });
  }
  const manifest = parseManifest(manifestJson);
  const manifestDirectory = dirname(resolve(options.manifestPath));
  const fileContents = new Map<string, string>();
  for (const input of [
    manifest.trucks,
    manifest.engines,
    manifest.gearboxes,
    manifest.wheels,
    manifest.addons,
  ]) {
    if (input === undefined) continue;
    try {
      fileContents.set(
        input.path,
        readFileSync(resolve(manifestDirectory, input.path), 'utf8'),
      );
    } catch (error) {
      throw new Error(
        `Cannot read input file "${input.path}" (from manifest directory)`,
        { cause: error },
      );
    }
  }

  const result = runValidatedImport(manifest, fileContents);
  writeFileAtomic(options.reportPath, result.reportJson);
  if (result.ok) writeFileAtomic(options.outPath, result.datasetJson);

  const { report } = result;
  console.log(
    `Import ${result.ok ? 'completed' : 'FAILED'} for dataset "${report.datasetVersion}".`,
  );
  console.log(
    `Entities: ${report.entities.trucks.length} truck(s), ${report.entities.components.length} component(s).`,
  );
  if (report.discardedRows.length > 0)
    console.warn(
      `Discarded rows: ${report.discardedRows.length} (see report).`,
    );
  if (report.inconsistencies.length > 0)
    console.warn(
      `Intra-source inconsistencies: ${report.inconsistencies.length} (see report).`,
    );
  if (!report.datasetValidation.ok)
    for (const issue of report.datasetValidation.issues)
      console.warn(`Validation: ${issue}`);
  console.log(`Report written to ${options.reportPath}`);
  if (result.ok) console.log(`Dataset written to ${options.outPath}`);
  return result.ok ? 0 : 1;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
