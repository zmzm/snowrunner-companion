import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

function boundary(files, forbidden) {
  return {
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: forbidden,
              message:
                'Follow docs/architecture.md package dependency boundaries.',
            },
            {
              group: [
                '**/packages/**',
                '**/apps/**',
                '**/tools/**',
                '@snowrunner/*/src/**',
              ],
              message:
                'Import workspace packages through their public exports.',
            },
          ],
        },
      ],
    },
  };
}
export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  {
    files: ['apps/web/src/**/*.{ts,tsx}', 'packages/ui/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  boundary(
    ['packages/domain/**/*.{ts,tsx}'],
    ['@snowrunner/*', 'react', 'react-dom', 'node:*', 'zod'],
  ),
  boundary(
    ['packages/game-data/**/*.{ts,tsx}'],
    [
      '@snowrunner/web',
      '@snowrunner/ui',
      '@snowrunner/data-import',
      'react',
      'react-dom',
    ],
  ),
  boundary(['packages/ui/**/*.{ts,tsx}'], ['@snowrunner/*']),
  boundary(['apps/web/**/*.{ts,tsx}'], ['@snowrunner/data-import', 'node:*']),
  boundary(
    ['tools/data-import/**/*.{ts,tsx}'],
    ['@snowrunner/web', '@snowrunner/ui'],
  ),
);
