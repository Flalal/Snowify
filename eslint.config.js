import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  // ─── Ignores ───
  { ignores: ['node_modules/**', 'dist/**', 'out/**', 'bin/**', 'mobile/**', 'assets/**'] },

  // ─── Base recommandée ───
  js.configs.recommended,

  // ─── Toutes les sources ───
  {
    files: ['src/**/*.{js,jsx}', 'electron.vite.config.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    rules: {
      // Erreurs possibles
      'no-constant-binary-expression': 'error',
      'no-constructor-return': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unreachable-loop': 'error',

      // Best practices
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-throw-literal': 'error',
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'prefer-arrow-callback': 'error',

      // Unused vars : strict mais _ prefix autorisé
      'no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
        destructuredArrayIgnorePattern: '^_'
      }],

      'no-console': 'off'
    }
  },

  // ─── Main process (Node ESM) ───
  { files: ['src/main/**/*.js'], languageOptions: { globals: { ...globals.node } } },

  // ─── Preload (CommonJS) ───
  { files: ['src/preload/**/*.js'], languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } } },

  // ─── Shared ───
  { files: ['src/shared/**/*.js'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },

  // ─── Renderer (Browser + Preact JSX) ───
  {
    files: ['src/renderer/**/*.{js,jsx}'],
    plugins: { react: reactPlugin, 'react-hooks': reactHooksPlugin },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true }, jsxPragma: 'h', jsxFragmentName: 'Fragment' }
    },
    rules: {
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },

  // ─── Config root ───
  { files: ['electron.vite.config.mjs'], languageOptions: { globals: { ...globals.node } } },

  // ─── Prettier (MUST be last) ───
  prettierConfig
];
