module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
  overrides: [
    {
      // Keep the framework out of the domain (CLAUDE.md). Never disable this rule.
      files: ['src/**/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@nestjs/*', '@prisma/*', 'class-validator', 'class-transformer'],
                message: 'domain/ must be pure TypeScript: no Nest, Prisma or validation libraries.',
              },
              {
                group: ['**/application', '**/application/**', '**/infrastructure', '**/infrastructure/**', '**/api', '**/api/**'],
                message: 'domain/ must not import from application/, infrastructure/ or api/. Dependencies point inward.',
              },
            ],
          },
        ],
      },
    },
  ],
};
