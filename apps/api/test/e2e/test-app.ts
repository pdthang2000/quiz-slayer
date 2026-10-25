import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/prisma/prisma.service';
import { resetDb } from '../int/db';

export type Tag = { id: string; name: string; color: string };
export type CardBody = {
  id: string;
  front: string;
  back: string;
  tags: Tag[];
  createdAt: string;
  version: number;
};
export type TagWithCount = Tag & { cardCount: number };

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

  return {
    http,
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
    trash: (id: string) => http().post(`/cards/${id}/trash`).expect(204),
  };
}

export const tagNames = (card: CardBody) => card.tags.map((t) => t.name).sort();

export const tick = () => new Promise((r) => setTimeout(r, 3));
