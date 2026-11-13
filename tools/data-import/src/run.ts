import { createHash } from 'node:crypto';
import { datasetSchema } from '@snowrunner/game-data';
import { ImportManifestError, parseManifest, type Manifest } from './manifest';
import { normalizeImport } from './normalize';
import type { ImportFile, ImportReport } from './report';

export type RunResult =
  | {
      ok: true;
      datasetJson: string;
      report: ImportReport & { datasetValidation: { ok: true } };
      reportJson: string;
    }
  | {
      ok: false;
      datasetJson: null;
      report: ImportReport & {
        datasetValidation: { ok: false; issues: readonly string[] };
      };
      reportJson: string;
    };

export { ImportManifestError } from './manifest';

export class ImportHashMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportHashMismatchError';
  }
}

export function sha256Of(content: string): string {
  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`;
}

export function runImport(
  manifestInput: unknown,
  fileContents: ReadonlyMap<string, string>,
): RunResult {
  return runValidatedImport(parseManifest(manifestInput), fileContents);
}

/** Internal entry point for the CLI after manifest validation and file loading. */
export function runValidatedImport(
  manifest: Manifest,
  fileContents: ReadonlyMap<string, string>,
): RunResult {
  const files = new Map<string, ImportFile>();
  const hashErrors: string[] = [];
  for (const tab of [
    'trucks',
    'engines',
    'gearboxes',
    'wheels',
    'addons',
  ] as const) {
    const input = manifest[tab];
    if (input === undefined) continue;
    const content = fileContents.get(input.path);
    if (content === undefined)
      throw new ImportManifestError(
        `File "${input.path}" (tab "${tab}") was not supplied`,
      );
    const actual = sha256Of(content);
    const source = manifest.sources.find(
      (entry) => entry.sourceId === input.sourceId,
    );
    if (source !== undefined && source.sourceVersion !== actual)
      hashErrors.push(
        `${input.path}: expected ${source.sourceVersion}, computed ${actual} (tab "${tab}", source "${input.sourceId}")`,
      );
    files.set(input.path, { content, sha256: actual });
  }
  if (hashErrors.length > 0)
    throw new ImportHashMismatchError(
      `Source hash verification failed:\n  - ${hashErrors.join('\n  - ')}`,
    );

  const { trucks, components, report } = normalizeImport(manifest, files);
  const dataset = {
    schemaVersion: 1,
    datasetVersion: manifest.datasetVersion,
    sources: manifest.sources,
    trucks,
    components,
  };
  const validation = datasetSchema.safeParse(dataset);
  if (validation.success) {
    const finalReport = { ...report, datasetValidation: { ok: true as const } };
    return {
      ok: true,
      datasetJson: `${JSON.stringify(dataset, null, 2)}\n`,
      report: finalReport,
      reportJson: `${JSON.stringify(finalReport, null, 2)}\n`,
    };
  }
  const datasetValidation = {
    ok: false as const,
    issues: validation.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    ),
  };
  const finalReport = { ...report, datasetValidation };
  return {
    ok: false,
    datasetJson: null,
    report: finalReport,
    reportJson: `${JSON.stringify(finalReport, null, 2)}\n`,
  };
}
