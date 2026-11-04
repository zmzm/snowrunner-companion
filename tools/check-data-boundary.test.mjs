import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const checker = fileURLToPath(
  new URL('./check-data-boundary.mjs', import.meta.url),
);

// Each disposable repository contains only authored synthetic placeholder files.
function checkFiles(paths) {
  const directory = mkdtempSync(join(tmpdir(), 'snowrunner-boundary-'));
  try {
    execFileSync('git', ['init', '--quiet', directory]);
    for (const path of paths) {
      const target = join(directory, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, 'Synthetic test placeholder\n');
    }
    execFileSync('git', ['add', '--', ...paths], { cwd: directory });
    const result = spawnSync(process.execPath, [checker], {
      cwd: directory,
      encoding: 'utf8',
    });
    if (result.error) throw result.error;
    return result;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('allows documentation and authored synthetic fixtures', () => {
  const result = checkFiles(['README.md', 'fixtures/synthetic/truck.json']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Data boundary check passed/);
});

test('rejects forbidden files after an allowed path in NUL-separated Git output', () => {
  const forbidden = [
    'data/raw/input.xml',
    'data/normalized/truck.json',
    'data/reports/audit.md',
    'packages/game-data/generated/catalog.json',
    'snapshots/game.PAK',
    'snapshots/game.zip',
    'snapshots/game.7z',
  ];
  const result = checkFiles(['README.md', ...forbidden]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(
    result.stderr,
    'Forbidden tracked research artifacts:\n' +
      forbidden
        .sort()
        .map((path) => '  - ' + path)
        .join('\n') +
      '\n',
  );
});
