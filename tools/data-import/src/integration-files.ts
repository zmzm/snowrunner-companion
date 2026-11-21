import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';
import { parseManifest } from './manifest';
import { xmlManifestSchema } from './xml';
import { integrateDevelopmentCatalog } from './integrate';

const path = z.string().min(1);
export const integrationFilesSchema = z.strictObject({
  csvManifest: path,
  xmlManifest: path,
  review: path,
  xmlRoot: path.optional(),
  xmlResolution: path.optional(),
  outputName: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*$/),
});
function json(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}
function inside(root: string, path: string): string {
  const target = resolve(root, path);
  const rel = relative(root, target);
  if (isAbsolute(path) || rel === '..' || rel.startsWith('../'))
    throw new Error('Manifest input escapes its source directory');
  const actualRoot = realpathSync(root);
  const actualTarget = realpathSync(target);
  const actualRelative = relative(actualRoot, actualTarget);
  if (
    actualRelative === '..' ||
    actualRelative.startsWith('../') ||
    isAbsolute(actualRelative)
  )
    throw new Error('Manifest input symlink escapes its source directory');
  return actualTarget;
}
/** Config paths are relative to the config file; source paths stay within their roots. */
export function runIntegrationFiles(
  configPath: string,
  workspaceRoot: string,
): {
  catalogPath: string;
  reportPath: string;
  applied: number;
  withheld: number;
} {
  const config = integrationFilesSchema.parse(json(configPath));
  const configRoot = dirname(resolve(configPath));
  const catalogPath = resolve(
    workspaceRoot,
    'data/normalized',
    config.outputName + '.json',
  );
  const reportPath = resolve(
    workspaceRoot,
    'data/reports',
    config.outputName + '.json',
  );
  if (existsSync(catalogPath) || existsSync(reportPath))
    throw new Error(
      'Integration output already exists; choose a new outputName',
    );
  const csvPath = resolve(configRoot, config.csvManifest);
  const xmlPath = resolve(configRoot, config.xmlManifest);
  const csvManifest = parseManifest(json(csvPath));
  const xmlManifest = xmlManifestSchema.parse(json(xmlPath));
  const csvContents = new Map<string, string>();
  for (const tab of [
    csvManifest.trucks,
    csvManifest.engines,
    csvManifest.gearboxes,
    csvManifest.wheels,
    csvManifest.addons,
  ])
    if (tab)
      csvContents.set(
        tab.path,
        readFileSync(inside(dirname(csvPath), tab.path), 'utf8'),
      );
  const xmlRoot = config.xmlRoot
    ? resolve(configRoot, config.xmlRoot)
    : dirname(xmlPath);
  const xmlContents = new Map(
    xmlManifest.files.map((file) => [
      file.path,
      readFileSync(inside(xmlRoot, file.path), 'utf8'),
    ]),
  );
  const result = integrateDevelopmentCatalog({
    csvManifest,
    csvContents,
    xmlManifest,
    xmlContents,
    review: json(resolve(configRoot, config.review)),
    ...(config.xmlResolution
      ? { xmlResolution: json(resolve(configRoot, config.xmlResolution)) }
      : {}),
  });
  mkdirSync(dirname(catalogPath), { recursive: true });
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(catalogPath, JSON.stringify(result, null, 2) + '\n', {
    flag: 'wx',
  });
  writeFileSync(reportPath, JSON.stringify(result.report, null, 2) + '\n', {
    flag: 'wx',
  });
  return { catalogPath, reportPath, ...result.report.projections };
}
