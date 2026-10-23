import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './test-database';

/**
 * Applies pending migrations to the test database (creates it if missing).
 * Non-destructive: each test empties the tables it uses (see db.ts).
 */
export default function globalSetup(): void {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
}
