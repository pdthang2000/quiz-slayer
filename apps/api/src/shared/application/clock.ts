/** The current time, as a port so tests can fix it (e.g. a session started at 23:55). */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('Clock');

export const systemClock: Clock = { now: () => new Date() };
