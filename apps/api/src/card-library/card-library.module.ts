import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CardsController } from './api/cards.controller';
import { DomainErrorFilter } from './api/domain-error.filter';
import { TagsController } from './api/tags.controller';
import { TrashController } from './api/trash.controller';
import { CardTags } from './application/card-tags';
import { CreateCard } from './application/create-card';
import { DeleteCardPermanently } from './application/delete-card-permanently';
import { DeleteTag } from './application/delete-tag';
import { EditCard } from './application/edit-card';
import { EmptyTrash } from './application/empty-trash';
import { MoveCardToTrash } from './application/move-card-to-trash';
import { AddCardsToTag } from './application/add-cards-to-tag';
import {
  GetCard,
  GetCardsByIds,
  ListCards,
  ListCardsToAddToTag,
  ListStudyCardIds,
  ListTags,
  ListTagsOfCard,
  ListTrash,
} from './application/queries';
import { RemoveCardsFromTag } from './application/remove-cards-from-tag';
import { RenameTag } from './application/rename-tag';
import { RestoreCard } from './application/restore-card';
import {
  CARD_LIBRARY_QUERIES,
  CARD_REPOSITORY,
  TAG_REPOSITORY,
} from './card-library.tokens';
import { PrismaCardLibraryQueries } from './infrastructure/prisma-card-library.queries';
import { PrismaCardRepository } from './infrastructure/prisma-card.repository';
import { PrismaTagRepository } from './infrastructure/prisma-tag.repository';

@Module({
  controllers: [CardsController, TrashController, TagsController],
  providers: [
    { provide: CARD_REPOSITORY, useClass: PrismaCardRepository },
    { provide: TAG_REPOSITORY, useClass: PrismaTagRepository },
    { provide: CARD_LIBRARY_QUERIES, useClass: PrismaCardLibraryQueries },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    CardTags,
    CreateCard,
    EditCard,
    MoveCardToTrash,
    RestoreCard,
    DeleteCardPermanently,
    EmptyTrash,
    RenameTag,
    DeleteTag,
    AddCardsToTag,
    RemoveCardsFromTag,
    ListCards,
    ListStudyCardIds,
    GetCardsByIds,
    ListCardsToAddToTag,
    ListTagsOfCard,
    GetCard,
    ListTrash,
    ListTags,
  ],
})
export class CardLibraryModule {}
