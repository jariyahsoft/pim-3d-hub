const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')

const sharedForbiddenImports = [
  'firebase',
  'firebase/*',
  '@google-cloud/*',
  'express',
  'express/*',
  'fastify',
  'fastify/*',
  'hono',
  'hono/*',
  'next',
  'next/*',
  'react',
  'react/*',
  'react-dom',
  'react-dom/*',
  '@pim/ui',
  '@pim/ui/*',
]

const privateWorkspaceSubpaths = [
  '@pim/*/*',
  '**/apps/*/src/*',
  '**/packages/*/src/*',
  '**/services/*/src/*',
]

module.exports = [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/__fixtures__/**',
      'tests/fixtures/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['packages/domain/**/*.{ts,tsx,mts,cts}', 'packages/application/**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [...sharedForbiddenImports, '@pim/infrastructure', '@pim/infrastructure/*', '@pim/api', '@pim/api/*', '@pim/web', '@pim/web/*', '@pim/admin', '@pim/admin/*', '@pim/mobile', '@pim/mobile/*', '@pim/workers', '@pim/workers/*'],
        },
      ],
    },
  },
  {
    files: ['apps/**/*.{ts,tsx,mts,cts}', 'services/**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: privateWorkspaceSubpaths,
        },
      ],
    },
  },
  {
    files: ['tests/fixtures/boundary/**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...sharedForbiddenImports,
            '@pim/infrastructure',
            '@pim/infrastructure/*',
            '@pim/api',
            '@pim/api/*',
            '@pim/web',
            '@pim/web/*',
            '@pim/admin',
            '@pim/admin/*',
            '@pim/mobile',
            '@pim/mobile/*',
            '@pim/workers',
            '@pim/workers/*',
          ],
        },
      ],
    },
  },
]
