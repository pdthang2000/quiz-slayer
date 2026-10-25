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
import { IfMatchVersion } from '../../shared/api/if-match-version.decorator';
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

  /** TRASH-12. `total` and `newestTrashedAt` are what the empty-trash dialog sends back (TRASH-11). */
  @Get()
  list(@CurrentUser() user: string, @Query() query: TrashQueryDto) {
    return this.listTrash.execute({
      userId: UserId(user),
      cursor: query.cursor,
    });
  }

  /** TRASH-07, TRASH-11 */
  @Post('empty')
  @HttpCode(204)
  async empty(@CurrentUser() user: string, @Body() body: EmptyTrashDto) {
    await this.emptyTrash.execute({
      userId: UserId(user),
      expectedCount: body.expectedCount,
      newestTrashedAt:
        body.newestTrashedAt === null ? null : new Date(body.newestTrashedAt),
    });
  }

  /** TRASH-04, CARD-08. Returns the new version. */
  @Post(':id/restore')
  @HttpCode(200)
  async restore(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @IfMatchVersion() version: number,
  ) {
    const result = await this.restoreCard.execute({
      userId: UserId(user),
      cardId: CardId(id),
      version,
    });
    return { id, version: result.version };
  }

  /** TRASH-05, CARD-08 */
  @Delete(':id')
  @HttpCode(204)
  async deletePermanently(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @IfMatchVersion() version: number,
  ) {
    await this.deleteCardPermanently.execute({
      userId: UserId(user),
      cardId: CardId(id),
      version,
    });
  }
}
