import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Only repositories use this (CLAUDE.md). Transactions: ADR-008.
 * Wraps PrismaClient instead of extending it, so every query goes through `db`
 * and joins the current transaction.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client = new PrismaClient();
  private readonly transaction =
    new AsyncLocalStorage<Prisma.TransactionClient>();

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  /** The client to query with: the current transaction's, or the root client. */
  get db(): Prisma.TransactionClient {
    return this.transaction.getStore() ?? this.client;
  }

  get inTransaction(): boolean {
    return this.transaction.getStore() !== undefined;
  }

  /** Runs `work` in one transaction. A nested call joins the outer transaction. */
  runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.inTransaction) return work();
    return this.client.$transaction((tx) => this.transaction.run(tx, work), {
      maxWait: 5_000, // waiting for a connection
      timeout: 30_000, // a TAG-10 merge of thousands of cards
    });
  }
}
