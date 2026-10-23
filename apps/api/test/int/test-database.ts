/** Integration tests use their own database so dev data is never wiped. */
export const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://quizslayer:quizslayer@localhost:5432/quizslayer_test?schema=public';
