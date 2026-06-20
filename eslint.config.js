import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// Flat config. Linting (correctness + a few project rules) — formatting is
// Prettier's job (eslint-config-prettier turns off any rule that would fight it).
export default tseslint.config(
  {
    ignores: [
      'dist/',
      'dev-dist/',
      'node_modules/',
      'coverage/',
      'public/',
      '*.config.{js,ts,mjs,cjs}',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.svelte'] },
    },
  },
  {
    rules: {
      // "No console.log in committed code" — warn, allow warn/error for genuine
      // diagnostics (matches the project's documented convention).
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
);
