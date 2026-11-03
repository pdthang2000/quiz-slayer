import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DailyPracticeQueries,
  FinishedDay,
} from '../application/daily-practice-queries';
import type { DailySession } from '../domain/daily-session';
import { TrackId, type UserId } from '../domain/ids';
import type { LocalDate } from '../domain/local-date';
import type { Track } from '../domain/track';
import { toDailySession, toDbDate, toLocalDate, toTrack } from './mappers';

@Injectable()
export class PrismaDailyPracticeQueries implements DailyPracticeQueries {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveTracks(userId: UserId): Promise<Track[]> {
    const rows = await this.prisma.db.track.findMany({
      where: { userId, state: 'Active' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toTrack);
  }

  async finishedDays(userId: UserId): Promise<FinishedDay[]> {
    const rows = await this.prisma.db.dailySession.findMany({
      where: { userId, finishedAt: { not: null } },
      select: { trackId: true, day: true },
    });
    return rows.map((r) => ({
      trackId: TrackId(r.trackId),
      day: toLocalDate(r.day).value,
    }));
  }

  async sessionsOn(userId: UserId, day: LocalDate): Promise<DailySession[]> {
    const rows = await this.prisma.db.dailySession.findMany({
      where: { userId, day: toDbDate(day) },
    });
    return rows.map(toDailySession);
  }

  async history(userId: UserId, trackId: TrackId): Promise<DailySession[]> {
    const rows = await this.prisma.db.dailySession.findMany({
      where: { userId, trackId },
      orderBy: { day: 'desc' },
    });
    return rows.map(toDailySession);
  }
}
