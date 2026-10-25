import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TransactionConflict } from '../shared/application/transaction-conflict';

/** B-11: retries after a deadlock or serialization failure, then TransactionConflict. */
const MAX_RETRIES = 3;

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

  /**
   * Runs `work` in one transaction. A nested call joins the outer transaction.
   * B-11: if Postgres aborts it for a deadlock or serialization failure, the whole
   * transaction runs again (up to MAX_RETRIES times), so `work` must load what it changes.
   */
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.inTransaction) return work();
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.client.$transaction(
          (tx) => this.transaction.run(tx, work),
          {
            maxWait: 5_000, // waiting for a connection
            timeout: 30_000, // a TAG-10 merge of thousands of cards
          },
        );
      } catch (error) {
        if (!isTransactionConflict(error)) throw error;
        if (attempt > MAX_RETRIES) {
          throw new TransactionConflict(attempt, { cause: error });
        }
      }
    }
  }
}

/** Postgres 40P01 (deadlock) / 40001 (serialization failure), as Prisma reports them. */
const CONFLICT_CODES = ['40P01', '40001'];

function isTransactionConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2034: write conflict or deadlock. P2010: a raw query failed; meta.code is Postgres'.
    return (
      error.code === 'P2034' ||
      CONFLICT_CODES.includes(error.meta?.code as string)
    );
  }
  // Errors Prisma doesn't classify (unknown request errors) carry only the text.
  const text =
    error instanceof Error ? `${error.message} ${JSON.stringify(error)}` : '';
  return /40P01|40001|deadlock detected|could not serialize/.test(text);
}
