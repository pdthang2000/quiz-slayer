import { Module } from '@nestjs/common';
import { CardLibraryModule } from './card-library/card-library.module';
import { DailyPracticeModule } from './daily-practice/daily-practice.module';
import { QuestionBankModule } from './question-bank/question-bank.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    PrismaModule,
    SharedModule,
    CardLibraryModule,
    QuestionBankModule,
    DailyPracticeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
