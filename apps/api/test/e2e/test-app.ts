import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/prisma/prisma.service';
import { resetDb } from '../int/db';

export type Tag = { id: string; name: string; color: string; version: number };
export type CardBody = {
  id: string;
  front: string;
  back: string;
  tags: Tag[];
  createdAt: string;
  version: number;
};
export type TagWithCount = Tag & { cardCount: number };
export type TrashPage = {
  items: (CardBody & { trashedAt: string })[];
  total: number;
  newestTrashedAt: string | null;
  nextCursor: string | null;
};

/** The real app (pipes, filter, DI) against the test database. */
export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app: INestApplication<App> = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  const prisma = app.get(PrismaService);
  const http = () => request(app.getHttpServer());

  /** The card's current version, as a fresh screen would show it (CONFLICT-01). */
  const version = async (cardId: string) =>
    (
      await prisma.db.card.findUniqueOrThrow({
        where: { id: cardId },
        select: { version: true },
      })
    ).version;

  const trashPage = async (query = '') =>
    (await http().get(`/trash${query}`).expect(200)).body as TrashPage;

  return {
    http,
    version,
    trashPage,
    reset: () => resetDb(prisma),
    close: () => app.close(),
    async createCard(front: string, tags: string[] = [], back = 'back') {
      const res = await http()
        .post('/cards')
        .send({ front, back, tags })
        .expect(201);
      return res.body as CardBody;
    },
    async tags() {
      const res = await http().get('/tags').expect(200);
      return res.body as TagWithCount[];
    },
    async tagNamed(name: string) {
      const res = await http().get('/tags').expect(200);
      return (res.body as TagWithCount[]).find((t) => t.name === name);
    },
    async listFronts(query = '') {
      const res = await http().get(`/cards${query}`).expect(200);
      return (res.body as { items: CardBody[] }).items.map((c) => c.front);
    },
    /** Each helper sends the current version, like a screen that is up to date. */
    async trash(id: string) {
      const res = await http()
        .post(`/cards/${id}/trash`)
        .send({ version: await version(id) })
        .expect(200);
      return res.body as { id: string; version: number };
    },
    async restore(id: string) {
      const res = await http()
        .post(`/trash/${id}/restore`)
        .send({ version: await version(id) })
        .expect(200);
      return res.body as { id: string; version: number };
    },
    async deletePermanently(id: string) {
      await http()
        .delete(`/trash/${id}`)
        .send({ version: await version(id) })
        .expect(204);
    },
    async emptyTrash() {
      const { total, newestTrashedAt } = await trashPage();
      await http()
        .post('/trash/empty')
        .send({ expectedCount: total, newestTrashedAt })
        .expect(204);
    },
    async renameTag(
      name: string,
      to: string,
      confirmMerge?: boolean,
    ): Promise<{ status: number; body: Record<string, unknown> }> {
      const tag = (await this.tagNamed(name))!;
      const res = await http()
        .patch(`/tags/${tag.id}`)
        .send({ name: to, version: tag.version, confirmMerge });
      return { status: res.status, body: res.body as Record<string, unknown> };
    },
    async deleteTag(name: string) {
      const tag = (await this.tagNamed(name))!;
      await http()
        .delete(`/tags/${tag.id}`)
        .send({ version: tag.version })
        .expect(204);
    },
  };
}

export const tagNames = (card: CardBody) => card.tags.map((t) => t.name).sort();

export const tick = () => new Promise((r) => setTimeout(r, 3));
