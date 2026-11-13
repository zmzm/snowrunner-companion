import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';

const eslint = new ESLint();

async function restrictedImports(filePath, specifier) {
  const results = await eslint.lintText(`import '${specifier}';\n`, {
    filePath,
  });
  return results
    .flatMap((result) => result.messages)
    .filter((message) => message.ruleId === 'no-restricted-imports');
}

for (const [filePath, specifier] of [
  ['apps/web/src/App.tsx', '@snowrunner/data-import'],
  ['apps/web/src/App.tsx', '@snowrunner/data-import/cli'],
  ['packages/domain/src/entities.ts', 'react/jsx-runtime'],
  ['packages/game-data/src/entities.ts', 'react-dom/server'],
  ['apps/web/src/App.tsx', '@snowrunner/game-data/entities'],
  ['apps/web/src/App.tsx', '../../../packages/game-data/src/entities'],
]) {
  test(`${filePath} rejects ${specifier}`, async () => {
    assert.ok((await restrictedImports(filePath, specifier)).length > 0);
  });
}

for (const [filePath, specifier] of [
  ['apps/web/src/App.tsx', '@snowrunner/game-data'],
  ['packages/game-data/src/entities.ts', '@snowrunner/domain'],
  ['tools/data-import/src/run.ts', '@snowrunner/game-data'],
  ['tools/data-import/src/run.ts', './normalize'],
]) {
  test(`${filePath} permits ${specifier}`, async () => {
    assert.equal((await restrictedImports(filePath, specifier)).length, 0);
  });
}
