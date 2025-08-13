import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';
import cspell from '@cspell/eslint-plugin';

const config = [
  js.configs.recommended,
  {
    ignores: ['dist', 'dist-electron', 'out', 'electron', 'scripts'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
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
      'react-refresh': reactRefresh,
      react: react,
      import: importPlugin,
      sonarjs: sonarjs,
      '@cspell': cspell,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Use recommended rules from plugins
      ...reactHooks.configs.recommended.rules,
      ...react.configs.recommended.rules,

      // Essential TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-unused-vars': 'off', // Turn off base rule to use TypeScript version
      '@typescript-eslint/no-explicit-any': 'warn',

      // React-specific rules you wanted
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform

      // No default React imports - force specific imports
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

      // Import rules - enforce named exports
      'import/no-default-export': 'error',
      'import/prefer-default-export': 'off',

      // Enforce arrow function shorthand when possible
      'arrow-body-style': ['error', 'as-needed'],
      'prefer-arrow-callback': ['error', { allowNamedFunctions: false }],

      // Forbid console.log usage
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // TypeScript rules
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',

      // SonarJS rules - keep cognitive complexity reasonable
      'sonarjs/cognitive-complexity': ['warn', 25],

      // Spell checking for code
      '@cspell/spellchecker': ['warn'],
    },
  },
  {
    // TypeScript definition files should have relaxed rules
    files: ['**/*.d.ts'],
    rules: {
      // Allow unused variables in type definitions
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // Allow any types in definitions
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Allow default exports for config files
    files: [
      '*.config.*',
      'vite.config.*',
      'eslint.config.*',
      'postcss.config.*',
    ],
    rules: {
      'import/no-default-export': 'off',
    },
  },
];

export default config;
