import { connectTestDb, resetDb } from '../../../test/int/db';
import { newCard, newUserId } from './fixtures.int';
import { PrismaCardLibraryQueries } from './prisma-card-library.queries';
import { PrismaCardRepository } from './prisma-card.repository';

const prisma = connectTestDb();
const cards = new PrismaCardRepository(prisma);
const queries = new PrismaCardLibraryQueries(prisma);
const user = newUserId();

beforeEach(() => resetDb(prisma));
afterAll(() => prisma.onModuleDestroy());

describe('PrismaCardLibraryQueries', () => {
  it('READ-02: "load more" paging is correct when the DB session is not in UTC', async () => {
    for (let i = 1; i <= 25; i++) {
      await cards.add(newCard(user, `Card ${i}`)); // own transaction → own created_at
      await new Promise((r) => setTimeout(r, 2));
    }

    // One transaction = one connection, so SET LOCAL applies to both page queries.
    const fronts = await prisma.runInTransaction(async () => {
      await prisma.db.$executeRaw`SET LOCAL TIME ZONE 'Asia/Saigon'`;
      const first = await queries.listActiveCards(user, {});
      const second = await queries.listActiveCards(user, {
        cursor: first.nextCursor!,
      });
      return [...first.items, ...second.items].map((c) => c.front);
    });

    expect(fronts).toEqual(
      Array.from({ length: 25 }, (_, i) => `Card ${25 - i}`),
    );
  });
});
