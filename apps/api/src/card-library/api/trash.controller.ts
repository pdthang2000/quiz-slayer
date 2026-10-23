import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../shared/api/current-user.decorator';
import { DeleteCardPermanently } from '../application/delete-card-permanently';
import { EmptyTrash } from '../application/empty-trash';
import { ListTrash } from '../application/queries';
import { RestoreCard } from '../application/restore-card';
import { CardId, UserId } from '../domain/ids';
import { EmptyTrashDto, TrashQueryDto } from './dto';

@Controller('trash')
export class TrashController {
  constructor(
    private readonly listTrash: ListTrash,
    private readonly restoreCard: RestoreCard,
    private readonly deleteCardPermanently: DeleteCardPermanently,
    private readonly emptyTrash: EmptyTrash,
  ) {}

  @Get()
  list(@CurrentUser() user: string, @Query() query: TrashQueryDto) {
    return this.listTrash.execute({
      userId: UserId(user),
      cursor: query.cursor,
    });
  }

  @Post('empty')
  @HttpCode(204)
  async empty(@CurrentUser() user: string, @Body() body: EmptyTrashDto) {
    await this.emptyTrash.execute({
      userId: UserId(user),
      expectedCount: body.expectedCount,
    });
  }

  @Post(':id/restore')
  @HttpCode(204)
  async restore(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.restoreCard.execute({
      userId: UserId(user),
      cardId: CardId(id),
    });
  }

  @Delete(':id')
  @HttpCode(204)
  async deletePermanently(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.deleteCardPermanently.execute({
      userId: UserId(user),
      cardId: CardId(id),
    });
  }
}
