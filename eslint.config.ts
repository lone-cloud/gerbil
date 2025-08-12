import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';
import cspell from '@cspell/eslint-plugin';
import type { Linter } from 'eslint';

const config: Linter.Config[] = [
  {
    ignores: ['dist', 'dist-electron', 'out', 'electron', 'scripts'],
  },
  js.configs.recommended,
  sonarjs.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      react: react,
      import: importPlugin,
      '@cspell': cspell,
    },
    rules: {
      // Use recommended rules from plugins
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...react.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Override only the specific modern React patterns we want to enforce
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
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
          ],
        },
      ],
      // Enforce named exports for React components
      'import/no-default-export': 'error',
      'import/prefer-default-export': 'off',
      // Enforce arrow function shorthand when possible
      'arrow-body-style': ['error', 'as-needed'],
      'prefer-arrow-callback': ['error', { allowNamedFunctions: false }],
      // Disallow console.log usage
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // Warn about unnecessary explicit type annotations
      '@typescript-eslint/no-inferrable-types': 'warn',
      // Don't require explicit return types (prefer inference)
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Disable some overly strict security rules for Electron apps
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-object-injection': 'off',
      // Relax cognitive complexity for complex business logic
      'sonarjs/cognitive-complexity': ['warn', 25],
      // Spell checking for code
      '@cspell/spellchecker': ['warn'],
    },
  },
  {
    // Allow default exports for config files
    files: [
      '*.config.*',
      'vite.config.*',
      'tailwind.config.*',
      'eslint.config.*',
      'postcss.config.*',
    ],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      react: react,
      import: importPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...react.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
    },
  },
];

export default config;
