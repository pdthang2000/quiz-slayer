import { Inject, Injectable } from '@nestjs/common';
import { ListQuestionTags } from '../../question-bank/application/queries';
import { CLOCK, type Clock } from '../../shared/application/clock';
import {
  DAILY_PRACTICE_QUERIES,
  DAILY_SESSION_REPOSITORY,
  TRACK_REPOSITORY,
} from '../daily-practice.tokens';
import type { DailySessionId, TrackId, UserId } from '../domain/ids';
import { checkTimeZone, LocalDate } from '../domain/local-date';
import type {
  DailySessionRepository,
  TrackRepository,
} from '../domain/repositories';
import { bestStreak, streakLength } from '../domain/streak';
import type { DailyPracticeQueries } from './daily-practice-queries';
import { DailySessionNotFound, TrackNotFound } from './errors';
import {
  toSessionSummary,
  toSessionView,
  toTrackView,
  type DailySessionSummary,
  type DailySessionView,
  type TrackView,
} from './views';

export type TodayTrack = TrackView & {
  /** DP-19: this track's streak. */
  streak: number;
  /** DP-31: null until Start is tapped today. */
  session: DailySessionSummary | null;
  /** DP-63: yesterday's set while it can still be finished (DP-52). */
  yesterdaySession: DailySessionSummary | null;
};

/** DP-09, DP-19, G-5: the Today screen. */
export type TodayView = {
  day: string;
  overallStreak: number;
  /** DP-69: "Best 21" under the overall streak. */
  overallBestStreak: number;
  tracks: TodayTrack[];
};

/** DP-09, DP-18, DP-19, DP-23, DP-31, DP-63: tracks with today's progress and streaks. */
@Injectable()
export class GetToday {
  constructor(
    @Inject(DAILY_PRACTICE_QUERIES)
    private readonly queries: DailyPracticeQueries,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: {
    userId: UserId;
    timeZone: string | undefined;
  }): Promise<TodayView> {
    const timeZone = checkTimeZone(input.timeZone);
    const now = this.clock.now();
    const today = LocalDate.of(now, timeZone);
    const time = { now, timeZone };
    const [tracks, finished, sessions, yesterdays] = await Promise.all([
      this.queries.listActiveTracks(input.userId),
      this.queries.finishedDays(input.userId),
      this.queries.sessionsOn(input.userId, today),
      this.queries.sessionsOn(input.userId, today.addDays(-1)),
    ]);
    const allDays = finished.map((f) => f.day);
    return {
      day: today.value,
      overallStreak: streakLength(allDays, today),
      overallBestStreak: bestStreak(allDays),
      tracks: tracks.map((track) => {
        const session = sessions.find((s) => s.trackId === track.id);
        const yesterday = yesterdays.find(
          (s) => s.trackId === track.id && !s.isFinished,
        );
        return {
          ...toTrackView(track),
          streak: streakLength(
            finished.filter((f) => f.trackId === track.id).map((f) => f.day),
            today,
          ),
          session: session ? toSessionSummary(session, time) : null,
          yesterdaySession: yesterday
            ? toSessionSummary(yesterday, time)
            : null,
        };
      }),
    };
  }
}

/** DP-20, DP-22, DP-26: one session with its quizzes and the answers given. */
@Injectable()
export class GetDailySession {
  constructor(
    @Inject(DAILY_SESSION_REPOSITORY)
    private readonly sessions: DailySessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: {
    userId: UserId;
    sessionId: DailySessionId;
    timeZone?: string;
  }): Promise<DailySessionView> {
    const session = await this.sessions.findById(input.userId, input.sessionId);
    if (!session) throw new DailySessionNotFound(input.sessionId);
    return toSessionView(session, {
      now: this.clock.now(),
      timeZone: input.timeZone,
    });
  }
}

/** DP-26: past days of a track with their result, newest first. Removed tracks keep it (DP-15). */
@Injectable()
export class ListTrackHistory {
  constructor(
    @Inject(DAILY_PRACTICE_QUERIES)
    private readonly queries: DailyPracticeQueries,
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: {
    userId: UserId;
    trackId: TrackId;
    timeZone?: string;
  }): Promise<DailySessionSummary[]> {
    const track = await this.tracks.findById(input.userId, input.trackId);
    if (!track) throw new TrackNotFound(input.trackId);
    const time = { now: this.clock.now(), timeZone: input.timeZone };
    return (await this.queries.history(input.userId, input.trackId)).map((s) =>
      toSessionSummary(s, time),
    );
  }
}

/** DP-69: "Best: 12 days" in the History header. Removed tracks keep it (DP-15). */
@Injectable()
export class GetTrackBestStreak {
  constructor(
    @Inject(DAILY_PRACTICE_QUERIES)
    private readonly queries: DailyPracticeQueries,
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepository,
  ) {}

  async execute(input: {
    userId: UserId;
    trackId: TrackId;
  }): Promise<{ bestStreak: number }> {
    const track = await this.tracks.findById(input.userId, input.trackId);
    if (!track) throw new TrackNotFound(input.trackId);
    const finished = await this.queries.finishedDays(input.userId);
    return {
      bestStreak: bestStreak(
        finished.filter((f) => f.trackId === track.id).map((f) => f.day),
      ),
    };
  }
}

/** DP-09: Settings → Tracks. */
@Injectable()
export class ListTracks {
  constructor(
    @Inject(DAILY_PRACTICE_QUERIES)
    private readonly queries: DailyPracticeQueries,
  ) {}

  async execute(input: { userId: UserId }): Promise<TrackView[]> {
    return (await this.queries.listActiveTracks(input.userId)).map(toTrackView);
  }
}

export type QuestionTagOption = {
  name: string;
  quizCount: number;
  tracked: boolean;
};

/** G-2: question tags with quizzes, with counts, and whether the user already follows each. */
@Injectable()
export class ListTrackOptions {
  constructor(
    @Inject(DAILY_PRACTICE_QUERIES)
    private readonly queries: DailyPracticeQueries,
    private readonly questionTags: ListQuestionTags,
  ) {}

  async execute(input: { userId: UserId }): Promise<QuestionTagOption[]> {
    const [tags, tracks] = await Promise.all([
      this.questionTags.execute({ userId: input.userId }),
      this.queries.listActiveTracks(input.userId),
    ]);
    const tracked = new Set(tracks.map((t) => t.tagName));
    return tags.map((t) => ({ ...t, tracked: tracked.has(t.name) }));
  }
}
