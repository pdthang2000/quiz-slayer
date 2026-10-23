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
import { CreateCard } from '../application/create-card';
import { EditCard } from '../application/edit-card';
import { MoveCardToTrash } from '../application/move-card-to-trash';
import { GetCard, ListCards } from '../application/queries';
import { CardId, TagId, UserId } from '../domain/ids';
import { CardInputDto, ListCardsQueryDto } from './dto';

@Controller('cards')
export class CardsController {
  constructor(
    private readonly createCard: CreateCard,
    private readonly editCard: EditCard,
    private readonly moveCardToTrash: MoveCardToTrash,
    private readonly listCards: ListCards,
    private readonly getCard: GetCard,
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

  @Get(':id')
  get(@CurrentUser() user: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.getCard.execute({ userId: UserId(user), cardId: CardId(id) });
  }

  @Put(':id')
  async edit(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
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
    });
    return this.getCard.execute({ userId, cardId });
  }

  @Post(':id/trash')
  @HttpCode(204)
  async trash(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.moveCardToTrash.execute({
      userId: UserId(user),
      cardId: CardId(id),
    });
  }
}
