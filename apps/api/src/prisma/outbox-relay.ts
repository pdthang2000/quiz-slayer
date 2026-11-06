import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type {
  Outbox,
  OutboxEvent,
  OutboxHandler,
  OutboxHandlers,
} from '../shared/application/outbox';

/** How often undelivered events are looked for (a crash or a failed handler). */
const POLL_MS = Number(process.env.OUTBOX_POLL_MS ?? 5_000);
const BATCH = 50;
/** ADR-014: 5 s, 10 s, 20 s … up to an hour between tries of a failing event. */
const FIRST_RETRY_MS = 5_000;
const MAX_RETRY_MS = 3_600_000;

const retryDelayMs = (attempts: number) =>
  Math.min(FIRST_RETRY_MS * 2 ** Math.min(attempts, 20), MAX_RETRY_MS);

/**
 * B-10: the transactional outbox. `add` writes events in the caller's transaction;
 * `deliverPending` hands each undelivered event to its handlers in a new transaction that
 * also marks it delivered, so a handler's change and "delivered" commit together.
 * Rows are taken with FOR UPDATE SKIP LOCKED, so two relays never deliver the same row
 * at the same time. Events with no handler are just marked delivered.
 * A failing event waits for its next-attempt time, so it never blocks newer ones; handlers
 * must therefore accept events out of order (ADR-014).
 */
@Injectable()
export class OutboxRelay
  implements Outbox, OutboxHandlers, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger('Outbox');
  private readonly handlers = new Map<string, OutboxHandler[]>();
  private timer?: NodeJS.Timeout;
  private running?: Promise<number>;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap(): void {
    if (POLL_MS > 0) {
      this.timer = setInterval(() => this.deliverSoon(), POLL_MS);
      this.timer.unref();
    }
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.timer);
    await this.running?.catch(() => 0);
  }

  register(type: string, handler: OutboxHandler): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]);
  }

  async add(events: readonly OutboxEvent[]): Promise<void> {
    if (events.length === 0) return;
    if (!this.prisma.inTransaction) {
      throw new Error(
        'Outbox.add must run inside the transaction of the change',
      );
    }
    await this.prisma.db.outboxEvent.createMany({
      data: events.map((event) => ({
        id: randomUUID(),
        type: event.type,
        payload: event,
        nextAttemptAt: new Date(),
      })),
    });
  }

  deliverSoon(): void {
    void this.deliverPending().catch((error: unknown) =>
      this.logger.error('Outbox delivery failed', error as Error),
    );
  }

  /** Delivers undelivered events, oldest first. Returns how many were delivered. */
  deliverPending(): Promise<number> {
    // One run at a time per process; a second call waits for the current one, then runs.
    const previous = this.running ?? Promise.resolve(0);
    const run = previous.catch(() => 0).then(() => this.deliverAll());
    this.running = run;
    return run;
  }

  private async deliverAll(): Promise<number> {
    let delivered = 0;
    const tried = new Set<string>();
    for (;;) {
      const rows = await this.prisma.db.outboxEvent.findMany({
        where: {
          deliveredAt: null,
          nextAttemptAt: { lte: new Date() },
          id: { notIn: [...tried] },
        },
        orderBy: { occurredAt: 'asc' },
        select: { id: true },
        take: BATCH,
      });
      for (const { id } of rows) {
        tried.add(id);
        if (await this.deliverOne(id)) delivered++;
      }
      if (rows.length < BATCH) return delivered;
    }
  }

  /** true = delivered now. false = taken by another relay, already delivered, or failed. */
  private async deliverOne(id: string): Promise<boolean> {
    try {
      return await this.prisma.runInTransaction(async () => {
        // Locking read (raw SQL for locking only, CLAUDE.md).
        const rows = await this.prisma.db.$queryRaw<
          { type: string; payload: unknown }[]
        >`
          SELECT type, payload FROM outbox_event
          WHERE id = ${id}::uuid AND delivered_at IS NULL
          FOR UPDATE SKIP LOCKED`;
        if (rows.length === 0) return false;
        const event = rows[0].payload as OutboxEvent;
        for (const handler of this.handlers.get(rows[0].type) ?? []) {
          await handler(event);
        }
        await this.prisma.db.outboxEvent.update({
          where: { id },
          data: { deliveredAt: new Date(), attempts: { increment: 1 } },
        });
        return true;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Event ${id} failed; will retry: ${message}`);
      const { attempts } = await this.prisma.db.outboxEvent.findUniqueOrThrow({
        where: { id },
        select: { attempts: true },
      });
      await this.prisma.db.outboxEvent.update({
        where: { id },
        data: {
          attempts: attempts + 1,
          lastError: message.slice(0, 1000),
          nextAttemptAt: new Date(Date.now() + retryDelayMs(attempts)),
        },
      });
      return false;
    }
  }
}
