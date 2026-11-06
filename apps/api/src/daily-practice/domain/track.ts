import { AggregateRoot } from './aggregate-root';
import { InvalidDailySize, InvalidTrackKinds, TrackChanged } from './errors';
import type { TrackEvent } from './events';
import type { TrackId, UserId } from './ids';
import { isQuizKind, QUIZ_KINDS, type QuizKind } from './quiz-kind';

export type TrackState = 'active' | 'removed';

/** DP-12: default 10, allowed 1–50. */
export class DailySize {
  static readonly MIN = 1;
  static readonly MAX = 50;
  static readonly DEFAULT = 10;

  private constructor(readonly value: number) {}

  static create(input: number): DailySize {
    if (
      !Number.isInteger(input) ||
      input < DailySize.MIN ||
      input > DailySize.MAX
    ) {
      throw new InvalidDailySize(input);
    }
    return new DailySize(input);
  }
}

/** DP-12: which kinds a track includes. At least one (provisional, G-8); kept in QB-06 order. */
export function checkKinds(input: readonly string[]): QuizKind[] {
  if (input.some((k) => !isQuizKind(k))) throw new InvalidTrackKinds('unknown');
  const kinds = QUIZ_KINDS.filter((k) => input.includes(k));
  if (kinds.length === 0) throw new InvalidTrackKinds('empty');
  return kinds;
}

export type TrackSnapshot = {
  id: TrackId;
  userId: UserId;
  tagName: string;
  kinds: QuizKind[];
  dailySize: number;
  state: TrackState;
  version: number;
};

/**
 * A question tag the user follows (DP-09, DP-11), with its own settings (DP-12).
 * Removing keeps the track (and so its history and streak); adding the same tag again
 * makes it Active again (DP-15).
 */
export class Track extends AggregateRoot<TrackEvent> {
  private constructor(
    readonly id: TrackId,
    readonly userId: UserId,
    /** DP-11: the question tag's name; its pool is every quiz with this tag (QB-10). */
    readonly tagName: string,
    private _kinds: QuizKind[],
    private _dailySize: DailySize,
    private _state: TrackState,
    readonly version: number,
  ) {
    super();
  }

  /** DP-12: all kinds and daily size 10 by default (kinds default provisional, G-8). */
  static add(input: {
    id: TrackId;
    userId: UserId;
    tagName: string;
    kinds?: readonly string[];
    dailySize?: number;
  }): Track {
    const track = new Track(
      input.id,
      input.userId,
      input.tagName,
      checkKinds(input.kinds ?? QUIZ_KINDS),
      DailySize.create(input.dailySize ?? DailySize.DEFAULT),
      'active',
      0,
    );
    track.record({
      type: 'TrackAdded',
      trackId: track.id,
      userId: track.userId,
      tagName: track.tagName,
    });
    return track;
  }

  /** Rebuilds a stored track. Only infrastructure mappers call this. */
  static reconstitute(s: TrackSnapshot): Track {
    return new Track(
      s.id,
      s.userId,
      s.tagName,
      [...s.kinds],
      DailySize.create(s.dailySize),
      s.state,
      s.version,
    );
  }

  get kinds(): readonly QuizKind[] {
    return this._kinds;
  }

  get dailySize(): number {
    return this._dailySize.value;
  }

  get state(): TrackState {
    return this._state;
  }

  get isActive(): boolean {
    return this._state === 'active';
  }

  /** DP-53, CONFLICT-01: `version` is the one the screen showed. */
  assertVersion(version: number): void {
    if (version !== this.version) throw new TrackChanged();
  }

  /**
   * DP-12, DP-13: new settings apply from the next daily set; a set already started keeps
   * its snapshot, so nothing else changes here. Same settings → no-op, no event.
   */
  changeSettings(input: {
    kinds?: readonly string[];
    dailySize?: number;
  }): void {
    const kinds = input.kinds ? checkKinds(input.kinds) : this._kinds;
    const size =
      input.dailySize === undefined
        ? this._dailySize
        : DailySize.create(input.dailySize);
    if (
      kinds.join() === this._kinds.join() &&
      size.value === this._dailySize.value
    )
      return;
    this._kinds = kinds;
    this._dailySize = size;
    this.record({
      type: 'TrackSettingsChanged',
      trackId: this.id,
      userId: this.userId,
      kinds,
      dailySize: size.value,
    });
  }

  /** DP-15: history stays; already removed → no-op. */
  remove(): void {
    if (this._state === 'removed') return;
    this._state = 'removed';
    this.record({
      type: 'TrackRemoved',
      trackId: this.id,
      userId: this.userId,
    });
  }

  /** DP-15: adding the same tag again continues the track; already Active → no-op (G-10). */
  addAgain(): void {
    if (this._state === 'active') return;
    this._state = 'active';
    this.record({
      type: 'TrackAdded',
      trackId: this.id,
      userId: this.userId,
      tagName: this.tagName,
    });
  }

  toSnapshot(): TrackSnapshot {
    return {
      id: this.id,
      userId: this.userId,
      tagName: this.tagName,
      kinds: [...this._kinds],
      dailySize: this._dailySize.value,
      state: this._state,
      version: this.version,
    };
  }
}
