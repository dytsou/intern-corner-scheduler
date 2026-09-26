import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

const sourceFiles = ['**/*.{js,jsx}'];

export default [
  {
    ignores: ['dist/**', 'docs/**', 'node_modules/**', 'test-results/**'],
  },
  { ...eslint.configs.recommended, files: sourceFiles },
  { ...react.configs.flat.recommended, files: sourceFiles },
  { ...react.configs.flat['jsx-runtime'], files: sourceFiles },
  { ...reactHooks.configs.flat.recommended, files: sourceFiles },
  {
    files: sourceFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-refresh': reactRefresh },
    settings: { react: { version: 'detect' } },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/prop-types': 'off',
    },
  },
  prettier,
];
