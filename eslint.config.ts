import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';
// @ts-ignore - No types available
import noComments from 'eslint-plugin-no-comments';
// @ts-ignore - No types available
import promise from 'eslint-plugin-promise';

const config = [
  js.configs.recommended,
  {
    ignores: [
      'dist',
      'dist-electron',
      'out',
      'electron',
      'scripts',
      'release',
      'build',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    ignores: [
      '*.config.*',
      'vite.config.*',
      'eslint.config.*',
      'postcss.config.*',
    ],
    languageOptions: {
      ecmaVersion: 2020,
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        projectService: true,
        allowDefaultProject: true,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      react,
      sonarjs,
      'no-comments': noComments,
      import: importPlugin,
      promise,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs.stylistic.rules,

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-curly-brace-presence': [
        'error',
        { props: 'never', children: 'never' },
      ],

      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react'],
              importNames: ['default'],
              message:
                'Import specific React hooks/utilities instead of default React import. Use automatic JSX transform.',
            },
            {
              group: ['fs'],
              importNames: ['readFileSync', 'writeFileSync', 'existsSync'],
              message:
                'Use async file operations instead: readFile, writeFile, access from fs/promises',
            },
          ],
        },
      ],

      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name=/.*Sync$/]',
          message:
            'Synchronous file operations are forbidden. Use async alternatives.',
        },
        {
          selector:
            'CallExpression[callee.object.object.object.name="window"][callee.object.object.property.name="electronAPI"][callee.object.property.name="config"][callee.property.name="get"] Literal[value="currentKoboldBinary"]',
          message:
            'Direct access to currentKoboldBinary config is forbidden. Use window.electronAPI.kobold.getCurrentVersion() instead to get proper fallback logic.',
        },
        {
          selector:
            'CallExpression[callee.object.object.object.name="window"][callee.object.object.property.name="electronAPI"][callee.object.property.name="config"][callee.property.name="set"] Literal[value="currentKoboldBinary"]',
          message:
            'Direct setting of currentKoboldBinary config is forbidden. Use window.electronAPI.kobold.setCurrentVersion() instead.',
        },
        {
          selector:
            'ExpressionStatement[expression.type="AwaitExpression"]:has(CallExpression[callee.name="ensureDir"]) + ExpressionStatement[expression.type="AwaitExpression"]:has(CallExpression[callee.name="ensureDir"])',
          message:
            'Sequential ensureDir() calls detected. These can run in parallel using Promise.all().',
        },
        {
          selector:
            'ExpressionStatement[expression.type="AwaitExpression"]:has(CallExpression[callee.object.name="fs"][callee.property.name=/^(unlink|rmdir|mkdir|writeFile)$/]) + ExpressionStatement[expression.type="AwaitExpression"]:has(CallExpression[callee.object.name="fs"][callee.property.name=/^(unlink|rmdir|mkdir|writeFile)$/])',
          message:
            'Sequential file system operations detected. Independent operations can run in parallel using Promise.all().',
        },
      ],

      'import/no-default-export': 'error',
      'import/prefer-default-export': 'off',
      'import/no-unresolved': 'off',
      'import/no-relative-parent-imports': 'error',

      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      '@typescript-eslint/no-require-imports': 'error',

      'arrow-body-style': ['error', 'as-needed'],
      'prefer-arrow-callback': ['error', { allowNamedFunctions: false }],
      'object-shorthand': ['error', 'always'],
      'prefer-const': 'error',

      'no-console': 'error',

      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/return-await': ['error', 'never'],
      '@typescript-eslint/prefer-promise-reject-errors': 'error',

      'sonarjs/cognitive-complexity': ['warn', 25],

      'promise/prefer-await-to-then': 'error',
      'promise/prefer-await-to-callbacks': 'off',
      'promise/no-nesting': 'error',
      'promise/no-promise-in-callback': 'off',
      'promise/no-callback-in-promise': 'off',
      'promise/avoid-new': 'off',
      'promise/no-new-statics': 'error',
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/catch-or-return': 'off',
      'promise/no-native': 'off',

      'no-comments/disallowComments': 'error',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: [
      '*.config.*',
      'vite.config.*',
      'eslint.config.*',
      'postcss.config.*',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'import/no-default-export': 'off',
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'no-comments/disallowComments': 'off',
      'import/no-default-export': 'off',
    },
  },
];

export default config;
