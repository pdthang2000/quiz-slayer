// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
  {
    // Prisma stays in infrastructure/ (CLAUDE.md): no Prisma types elsewhere, and only
    // repositories touch PrismaService. src/prisma/ is PrismaService itself.
    // Must come before the domain block: for domain files that block replaces this one.
    files: ['src/**/*.ts'],
    ignores: ['src/**/infrastructure/**', 'src/prisma/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma/*'],
              message:
                'Prisma types stay in infrastructure/. Map rows to domain objects there.',
            },
            {
              group: ['**/prisma/prisma.service'],
              message: 'Only repositories (infrastructure/) use PrismaService.',
            },
          ],
        },
      ],
    },
  },
  {
    // Keep the framework out of the domain (CLAUDE.md). Never disable this rule.
    // The '../../' patterns assume domain/ stays flat. If it gets subfolders,
    // switch to eslint-plugin-boundaries or dependency-cruiser.
    files: ['src/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@nestjs/*',
                '@prisma/*',
                'class-validator',
                'class-transformer',
                'express',
              ],
              message:
                'domain/ must be pure TypeScript: no Nest, Prisma, Express or validation libraries.',
            },
            {
              group: [
                '**/application',
                '**/application/**',
                '**/infrastructure',
                '**/infrastructure/**',
                '**/api',
                '**/api/**',
              ],
              message:
                'domain/ must not import from application/, infrastructure/ or api/. Dependencies point inward.',
            },
            {
              group: ['../../*', '../../**'],
              message:
                'domain/ must not leave its bounded context. Talk to other contexts through public application services or events.',
            },
          ],
        },
      ],
    },
  },
);
