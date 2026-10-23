import { Injectable } from '@nestjs/common';
import { TransactionRunner } from '../shared/application/transaction-runner';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaTransactionRunner implements TransactionRunner {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.runInTransaction(work);
  }
}
