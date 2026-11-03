import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ListQuestionTags } from '../../question-bank/application/queries';
import { OUTBOX, type Outbox } from '../../shared/application/outbox';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../shared/application/transaction-runner';
import { TRACK_REPOSITORY } from '../daily-practice.tokens';
import { TrackId, type UserId } from '../domain/ids';
import type { TrackRepository } from '../domain/repositories';
import { Track } from '../domain/track';
import { QuestionTagNotFound, TrackNotFound } from './errors';
import { toTrackView, type TrackView } from './views';

/**
 * DP-09, DP-11, DP-15, G-2: follow a question tag that has quizzes. The same tag again:
 * a removed track becomes Active with its history and settings (DP-15); an Active one is
 * returned unchanged (G-10).
 */
@Injectable()
export class AddTrack {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepository,
    @Inject(OUTBOX) private readonly outbox: Outbox,
    private readonly questionTags: ListQuestionTags,
  ) {}

  async execute(input: {
    userId: UserId;
    tagName: string;
  }): Promise<TrackView> {
    const tags = await this.questionTags.execute({ userId: input.userId });
    const tag = tags.find(
      (t) => t.name === input.tagName.normalize('NFC').trim(),
    );
    if (!tag) throw new QuestionTagNotFound(input.tagName);
    return this.transactions.run(async () => {
      let track = await this.tracks.findByTagName(input.userId, tag.name);
      if (track) {
        track.addAgain();
        await this.tracks.save(track);
      } else {
        track = Track.add({
          id: TrackId(randomUUID()),
          userId: input.userId,
          tagName: tag.name,
        });
        await this.tracks.add(track);
      }
      await this.outbox.add(track.pullEvents());
      return toTrackView(track);
    });
  }
}

/** DP-15: removing keeps the history. */
@Injectable()
export class RemoveTrack {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepository,
    @Inject(OUTBOX) private readonly outbox: Outbox,
  ) {}

  execute(input: { userId: UserId; trackId: TrackId }): Promise<void> {
    return this.transactions.run(async () => {
      const track = await this.tracks.findById(input.userId, input.trackId);
      if (!track || !track.isActive) throw new TrackNotFound(input.trackId);
      track.remove();
      await this.tracks.save(track);
      await this.outbox.add(track.pullEvents());
    });
  }
}

/** DP-12, DP-13: kinds and daily size; applies from the next daily set. */
@Injectable()
export class ChangeTrackSettings {
  constructor(
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions: TransactionRunner,
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepository,
    @Inject(OUTBOX) private readonly outbox: Outbox,
  ) {}

  execute(input: {
    userId: UserId;
    trackId: TrackId;
    kinds?: string[];
    dailySize?: number;
  }): Promise<TrackView> {
    return this.transactions.run(async () => {
      const track = await this.tracks.findById(input.userId, input.trackId);
      if (!track || !track.isActive) throw new TrackNotFound(input.trackId);
      track.changeSettings({ kinds: input.kinds, dailySize: input.dailySize });
      await this.tracks.save(track);
      await this.outbox.add(track.pullEvents());
      return toTrackView(track);
    });
  }
}
