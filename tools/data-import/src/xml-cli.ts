import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { extractXml, xmlManifestSchema } from './xml';

// No output path switches: research output cannot be redirected into source.
try {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  if (args.length !== 1 || args[0] === undefined)
    throw new Error('Usage: pnpm import:xml -- <manifest.json>');
  const manifestPath = resolve(args[0]);
  const json: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const manifest = xmlManifestSchema.parse(json);
  const root = realpathSync(dirname(manifestPath));
  const contents = new Map<string, string>();
  for (const file of manifest.files) {
    const path = realpathSync(resolve(root, file.path));
    const local = relative(root, path);
    if (local.startsWith('..') || isAbsolute(local))
      throw new Error('Input must stay within manifest directory');
    contents.set(file.path, readFileSync(path, 'utf8'));
  }
  const result = extractXml(manifest, contents);
  const { report, ...graph } = result;
  for (const [folder, name, value] of [
    ['data/normalized', 'xml-development.json', graph],
    ['data/reports', 'xml-evidence.json', report],
  ] as const) {
    mkdirSync(folder, { recursive: true });
    const safeFolder = realpathSync(folder);
    if (safeFolder !== resolve(folder))
      throw new Error('Output directory cannot be a symlink');
    const target = resolve(folder, name);
    // Exclusive creation prevents symlink traversal and accidental research overwrite.
    writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, {
      flag: 'wx',
    });
  }
  console.log(
    'Development graph and evidence report written to ignored research directories.',
  );
} catch {
  // Source contents and private paths must not enter terminal/CI logs.
  console.error(
    'XML extraction failed. Check manifest, hashes, XML syntax and output file availability.',
  );
  process.exitCode = 1;
}
