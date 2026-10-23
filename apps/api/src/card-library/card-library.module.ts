import { Module } from '@nestjs/common';
import { CARD_REPOSITORY, TAG_REPOSITORY } from './card-library.tokens';
import { PrismaCardRepository } from './infrastructure/prisma-card.repository';
import { PrismaTagRepository } from './infrastructure/prisma-tag.repository';

@Module({
  providers: [
    { provide: CARD_REPOSITORY, useClass: PrismaCardRepository },
    { provide: TAG_REPOSITORY, useClass: PrismaTagRepository },
  ],
})
export class CardLibraryModule {}
