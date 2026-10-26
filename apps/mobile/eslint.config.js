// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // The app never imports the API's code (CLAUDE.md); shared types come from packages/.
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/apps/api/**', '@quizslayer/api*'], message: 'apps/mobile must not import apps/api.' }] },
      ],
    },
  },
]);
