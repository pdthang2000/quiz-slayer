import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { CurrentUser } from '../../shared/api/current-user.decorator';
import { DeleteTag } from '../application/delete-tag';
import { ListTags } from '../application/queries';
import { RenameTag } from '../application/rename-tag';
import { TagId, UserId } from '../domain/ids';
import { RenameTagDto } from './dto';

/** UI-08: no POST — tags are created only by typing them on a card (TAG-05). */
@Controller('tags')
export class TagsController {
  constructor(
    private readonly listTags: ListTags,
    private readonly renameTag: RenameTag,
    private readonly deleteTag: DeleteTag,
  ) {}

  @Get()
  list(@CurrentUser() user: string) {
    return this.listTags.execute({ userId: UserId(user) });
  }

  /** TAG-15: 409 TagMergeNeedsConfirmation with the preview, then resend with confirmMerge. */
  @Patch(':id')
  async rename(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RenameTagDto,
  ) {
    const tagId = await this.renameTag.execute({
      userId: UserId(user),
      tagId: TagId(id),
      name: body.name,
      confirmMerge: body.confirmMerge,
    });
    return { id: tagId };
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.deleteTag.execute({ userId: UserId(user), tagId: TagId(id) });
  }
}
