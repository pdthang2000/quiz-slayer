import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../shared/api/current-user.decorator';
import { IfMatchVersion } from '../../shared/api/if-match-version.decorator';
import { CreateCard } from '../application/create-card';
import { EditCard } from '../application/edit-card';
import { MoveCardToTrash } from '../application/move-card-to-trash';
import {
  GetCard,
  GetCardsByIds,
  ListCards,
  ListStudyCardIds,
  ListTagsOfCard,
} from '../application/queries';
import { CardId, TagId, UserId } from '../domain/ids';
import {
  CardIdsQueryDto,
  CardInputDto,
  ListCardsQueryDto,
  StudyIdsQueryDto,
} from './dto';

@Controller('cards')
export class CardsController {
  constructor(
    private readonly createCard: CreateCard,
    private readonly editCard: EditCard,
    private readonly moveCardToTrash: MoveCardToTrash,
    private readonly listCards: ListCards,
    private readonly getCard: GetCard,
    private readonly listStudyCardIds: ListStudyCardIds,
    private readonly getCardsByIds: GetCardsByIds,
    private readonly listTagsOfCard: ListTagsOfCard,
  ) {}

  @Post()
  async create(@CurrentUser() user: string, @Body() body: CardInputDto) {
    const userId = UserId(user);
    const cardId = await this.createCard.execute({
      userId,
      front: body.front,
      back: body.back,
      tagNames: body.tags,
    });
    return this.getCard.execute({ userId, cardId });
  }

  @Get()
  list(@CurrentUser() user: string, @Query() query: ListCardsQueryDto) {
    return this.listCards.execute({
      userId: UserId(user),
      search: query.q,
      tagIds: query.tag?.map(TagId),
      cursor: query.cursor,
    });
  }

  /** STUDY-01, STUDY-02: the session's card ids for the list's filter (same q/tag as GET /cards). */
  @Get('study-ids')
  async studyIds(
    @CurrentUser() user: string,
    @Query() query: StudyIdsQueryDto,
  ) {
    const ids = await this.listStudyCardIds.execute({
      userId: UserId(user),
      search: query.q,
      tagIds: query.tag?.map(TagId),
    });
    return { ids };
  }

  /** STUDY-02: ?id=…&id=… (max 20), in that order; trashed or deleted cards are left out. */
  @Get('by-ids')
  byIds(@CurrentUser() user: string, @Query() query: CardIdsQueryDto) {
    return this.getCardsByIds.execute({
      userId: UserId(user),
      cardIds: query.id.map(CardId),
    });
  }

  @Get(':id')
  get(@CurrentUser() user: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.getCard.execute({ userId: UserId(user), cardId: CardId(id) });
  }

  /** UI-14: the card's tags with Active counts. A tag's cards: GET /cards?tag=<id>. */
  @Get(':id/tags')
  tags(@CurrentUser() user: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.listTagsOfCard.execute({
      userId: UserId(user),
      cardId: CardId(id),
    });
  }

  /** CARD-07, CARD-08: If-Match = the version the editor was shown. */
  @Put(':id')
  async edit(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @IfMatchVersion() version: number,
    @Body() body: CardInputDto,
  ) {
    const userId = UserId(user);
    const cardId = CardId(id);
    await this.editCard.execute({
      userId,
      cardId,
      front: body.front,
      back: body.back,
      tagNames: body.tags,
      version,
    });
    return this.getCard.execute({ userId, cardId });
  }

  /** TRASH-01, CARD-08. Returns the new version (UI-13: Undo restores with it). */
  @Post(':id/trash')
  @HttpCode(200)
  async trash(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @IfMatchVersion() version: number,
  ) {
    const result = await this.moveCardToTrash.execute({
      userId: UserId(user),
      cardId: CardId(id),
      version,
    });
    return { id, version: result.version };
  }
}
