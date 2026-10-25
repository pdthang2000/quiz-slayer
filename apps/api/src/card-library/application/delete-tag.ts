import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../shared/application/event-publisher';
import { TAG_REPOSITORY } from '../card-library.tokens';
import { TagId, UserId } from '../domain/ids';
import type { TagRepository } from '../domain/tag-repository';
import { TagNotFound } from './errors';

/** TAG-06, TAG-07, TRASH-06: hard delete; cards keep existing. TAG-16: `version` = the one the screen showed. */
@Injectable()
export class DeleteTag {
  constructor(
    @Inject(TAG_REPOSITORY) private readonly tags: TagRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(input: {
    userId: UserId;
    tagId: TagId;
    version: number;
  }): Promise<void> {
    const tag = await this.tags.findById(input.userId, input.tagId);
    if (!tag) throw new TagNotFound(input.tagId);
    tag.assertVersion(input.version);
    tag.delete();
    await this.tags.delete(tag);
    this.events.publish(tag.pullEvents());
  }
}
