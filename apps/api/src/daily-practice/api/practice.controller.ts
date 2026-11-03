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
} from '@nestjs/common';
import { CurrentUser } from '../../shared/api/current-user.decorator';
import { AnswerQuiz } from '../application/answer-quiz';
import {
  GetDailySession,
  GetToday,
  ListTrackHistory,
  ListTrackOptions,
  ListTracks,
} from '../application/queries';
import { SaveQuestionAsCard } from '../application/save-question-as-card';
import { StartDailySession } from '../application/start-daily-session';
import {
  AddTrack,
  ChangeTrackSettings,
  RemoveTrack,
} from '../application/track-commands';
import {
  DailySessionId,
  QuestionId,
  QuizId,
  TrackId,
  UserId,
} from '../domain/ids';
import { AddTrackDto, AnswerDto, TrackSettingsDto } from './dto';
import { TimeZone } from './time-zone.decorator';

/** Daily Practice (daily-practice.md, ADR-013). Day-dependent calls need X-Time-Zone (DP-05). */
@Controller('practice')
export class PracticeController {
  constructor(
    private readonly getToday: GetToday,
    private readonly startDailySession: StartDailySession,
    private readonly getDailySession: GetDailySession,
    private readonly answerQuiz: AnswerQuiz,
    private readonly saveQuestionAsCard: SaveQuestionAsCard,
    private readonly listTrackHistory: ListTrackHistory,
    private readonly listTracks: ListTracks,
    private readonly listTrackOptions: ListTrackOptions,
    private readonly addTrack: AddTrack,
    private readonly removeTrack: RemoveTrack,
    private readonly changeTrackSettings: ChangeTrackSettings,
  ) {}

  /** G-5, DP-09, DP-19: tracks with today's progress and streaks. */
  @Get('today')
  today(@CurrentUser() user: string, @TimeZone() timeZone?: string) {
    return this.getToday.execute({ userId: UserId(user), timeZone });
  }

  /** DP-31 Start; DP-22 resumes today's set if it exists. */
  @Post('tracks/:id/start')
  @HttpCode(200)
  start(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @TimeZone() timeZone?: string,
  ) {
    return this.startDailySession.execute({
      userId: UserId(user),
      trackId: TrackId(id),
      timeZone,
    });
  }

  /** DP-22, DP-26: a session with its quizzes and answers. */
  @Get('sessions/:id')
  session(@CurrentUser() user: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.getDailySession.execute({
      userId: UserId(user),
      sessionId: DailySessionId(id),
    });
  }

  /** DP-03, DP-20, DP-21: answer one quiz; returns the session with the feedback. */
  @Post('sessions/:id/quizzes/:quizId/answer')
  @HttpCode(200)
  async answer(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() body: AnswerDto,
  ) {
    const userId = UserId(user);
    const sessionId = DailySessionId(id);
    await this.answerQuiz.execute({
      userId,
      sessionId,
      quizId: QuizId(quizId),
      choices: body.choices,
    });
    return this.getDailySession.execute({ userId, sessionId });
  }

  /** DP-10, DP-32, DP-40: creates a Card through Card Library. */
  @Post('sessions/:id/questions/:questionId/save-as-card')
  @HttpCode(201)
  saveAsCard(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return this.saveQuestionAsCard.execute({
      userId: UserId(user),
      sessionId: DailySessionId(id),
      questionId: QuestionId(questionId),
    });
  }

  /** DP-26 */
  @Get('tracks/:id/history')
  history(@CurrentUser() user: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.listTrackHistory.execute({
      userId: UserId(user),
      trackId: TrackId(id),
    });
  }

  @Get('tracks')
  tracks(@CurrentUser() user: string) {
    return this.listTracks.execute({ userId: UserId(user) });
  }

  /** G-2: question tags with quiz counts, to add a track from. */
  @Get('track-options')
  trackOptions(@CurrentUser() user: string) {
    return this.listTrackOptions.execute({ userId: UserId(user) });
  }

  /** DP-09, DP-15, G-10 */
  @Post('tracks')
  add(@CurrentUser() user: string, @Body() body: AddTrackDto) {
    return this.addTrack.execute({
      userId: UserId(user),
      tagName: body.tagName,
    });
  }

  /** DP-12, DP-13 */
  @Patch('tracks/:id')
  settings(
    @CurrentUser() user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TrackSettingsDto,
  ) {
    return this.changeTrackSettings.execute({
      userId: UserId(user),
      trackId: TrackId(id),
      kinds: body.kinds,
      dailySize: body.dailySize,
    });
  }

  /** DP-15: history stays. */
  @Delete('tracks/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.removeTrack.execute({
      userId: UserId(user),
      trackId: TrackId(id),
    });
  }
}
