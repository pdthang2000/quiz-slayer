// Loads every quiz file in prisma/seed/questions/ as System content (QB-10, content-ingestion.md).
// Safe to run again: a file re-imports its Quiz Set and keeps quiz ids (ImportQuizSet).
// Usage: pnpm --filter @quizslayer/api seed
import 'reflect-metadata';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { ImportQuizSet, type ImportFile } from '../../src/question-bank/application/import-quiz-set';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const importQuizSet = app.get(ImportQuizSet);
    const dir = join(__dirname, 'questions');
    for (const name of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const file = JSON.parse(readFileSync(join(dir, name), 'utf8')) as ImportFile;
      const result = await importQuizSet.execute(file);
      console.log(`${name}: "${file.quizSet}" — ${result.quizCount} quizzes`);
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
