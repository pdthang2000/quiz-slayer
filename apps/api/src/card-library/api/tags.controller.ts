import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../shared/api/current-user.decorator';
import { AddCardsToTag } from '../application/add-cards-to-tag';
import { DeleteTag } from '../application/delete-tag';
import { ListCardsToAddToTag, ListTags } from '../application/queries';
import { RemoveCardsFromTag } from '../application/remove-cards-from-tag';
import { RenameTag } from '../application/rename-tag';
import { CardId, TagId, UserId } from '../domain/ids';
import {
  RenameTagDto,
  TagCardsDto,
  TagPickerQueryDto,
  VersionDto,
} from './dto';

/** UI-08: no POST /tags — tags are created only by typing them on a card (TAG-05). */
@Controller('tags')
export class TagsController {
  constructor(
    private readonly listTags: ListTags,
    private readonly renameTag: RenameTag,
    private readonly deleteTag: DeleteTag,
    private readonly addCardsToTag: AddCardsToTag,
    private readonly removeCardsFromTag: RemoveCardsFromTag,
    private readonly listCardsToAddToTag: ListCardsToAddToTag,
  ) {}

  @Get()
  list(@CurrentUser() user: string) {
    return this.listTags.execute({ userId: UserId(user) });
  }

  /**
   * TAG-15: 409 TagMergeNeedsConfirmation with the preview, then resend with confirmMerge.
   * TAG-16: `version` = the one the screen showed. Returns the tag that carries the name
   * afterwards (the target after a merge) and its new version.
   */
  @Patch(':id')
  rename(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RenameTagDto,
  ) {
    return this.renameTag.execute({
      userId: UserId(user),
      tagId: TagId(id),
      version: body.version,
      name: body.name,
      confirmMerge: body.confirmMerge,
    });
  }

  /** TAG-06, TAG-16 */
  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: VersionDto,
  ) {
    await this.deleteTag.execute({
      userId: UserId(user),
      tagId: TagId(id),
      version: body.version,
    });
  }

  /** CARDTAG-08: the "+ Add cards" picker. The tag's own cards: GET /cards?tag=<id> (UI-14). */
  @Get(':id/cards-to-add')
  cardsToAdd(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TagPickerQueryDto,
  ) {
    return this.listCardsToAddToTag.execute({
      userId: UserId(user),
      tagId: TagId(id),
      search: query.q,
      cursor: query.cursor,
    });
  }

  /** CARDTAG-08, ADR-011: all or nothing. Returns the new versions of the tag and the cards. */
  @Post(':id/cards')
  @HttpCode(200)
  addCards(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TagCardsDto,
  ) {
    return this.addCardsToTag.execute({
      userId: UserId(user),
      tagId: TagId(id),
      cards: toCardVersions(body),
    });
  }

  /** CARDTAG-07, ADR-011: all or nothing. Returns the new versions of the tag and the cards. */
  @Delete(':id/cards')
  removeCards(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TagCardsDto,
  ) {
    return this.removeCardsFromTag.execute({
      userId: UserId(user),
      tagId: TagId(id),
      cards: toCardVersions(body),
    });
  }
}

function toCardVersions(body: TagCardsDto) {
  return body.cards.map((c) => ({
    cardId: CardId(c.cardId),
    version: c.version,
  }));
}
