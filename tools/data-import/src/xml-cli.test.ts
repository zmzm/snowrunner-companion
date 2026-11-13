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
import { expect, it } from 'vitest';
import { sha256Of } from './run';

it('writes research-only output, protects existing files, and suppresses malformed source contents', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'snowrunner-xml-'));
  const cli = fileURLToPath(new URL('./xml-cli.ts', import.meta.url));
  const xml = '<Truck><EngineSocket Default="synthetic_missing"/></Truck>';
  const manifest = {
    version: 1,
    source: {
      locator: 'synthetic:cli',
      version: 'test',
      retrievedAt: '2026-11-13T00:00:00Z',
      usageRights: 'Synthetic',
      adapter: 'synthetic',
    },
    entry: 'truck.xml',
    files: [{ path: 'truck.xml', sha256: sha256Of(xml) }],
    links: {},
  };
  const invoke = () =>
    spawnSync(
      process.execPath,
      ['--import', import.meta.resolve('tsx'), cli, 'manifest.json'],
      { cwd, encoding: 'utf8' },
    );
  try {
    writeFileSync(join(cwd, 'truck.xml'), xml);
    writeFileSync(join(cwd, 'manifest.json'), JSON.stringify(manifest));
    const first = invoke();
    expect(first.status, first.stderr).toBe(0);
    const output = join(cwd, 'data/normalized/xml-development.json');
    expect(JSON.parse(readFileSync(output, 'utf8'))).toMatchObject({
      developmentOnly: true,
    });
    expect(existsSync(join(cwd, 'data/reports/xml-evidence.json'))).toBe(true);
    writeFileSync(output, 'user research');
    expect(invoke().status).toBe(1);
    expect(readFileSync(output, 'utf8')).toBe('user research');
    writeFileSync(join(cwd, 'truck.xml'), 'PRIVATE_SOURCE_CONTENT');
    const failure = invoke();
    expect(failure.status).toBe(1);
    expect(failure.stderr).not.toContain('PRIVATE_SOURCE_CONTENT');
    expect(failure.stderr).not.toContain(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
