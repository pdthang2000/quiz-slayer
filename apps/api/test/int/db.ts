import { PrismaService } from '../../src/prisma/prisma.service';

/** One client per test file. */
export function connectTestDb(): PrismaService {
  return new PrismaService();
}

/** Empties every Card Library table. Test setup only. */
export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.db.$executeRaw`TRUNCATE card_tag, card, tag`;
}
