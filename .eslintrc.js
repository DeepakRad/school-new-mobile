module.exports = {
  root: true,
  env: { node: true },
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'prettier/prettier': ['error', { singleQuote: true, endOfLine: 'auto' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // Allow React Native convention: StyleSheet.create() and helper components
    // defined after the main component that uses them.
    '@typescript-eslint/no-use-before-define': [
      'error',
      { functions: false, classes: true, variables: false, typedefs: false },
    ],
  },
  overrides: [
    {
      // Provide type-aware linting for TS/TSX files only
      files: ['**/*.ts', '**/*.tsx'],
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx', 'e2e/**/*.ts'],
      env: { jest: true },
    },
  ],
};
