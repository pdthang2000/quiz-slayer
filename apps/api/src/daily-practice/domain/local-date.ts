import { InvalidTimeZone } from './errors';

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * DP-05: a calendar day in the phone's timezone, e.g. 2026-11-03. Compared as text;
 * no time, no zone once created. Stored on each session (ADR-013).
 */
export class LocalDate {
  private constructor(readonly value: string) {}

  static parse(value: string): LocalDate {
    const m = DATE.exec(value);
    if (!m) throw new RangeError(`"${value}" is not a YYYY-MM-DD date`);
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.toISOString().slice(0, 10) !== value) {
      throw new RangeError(`"${value}" is not a real date`);
    }
    return new LocalDate(value);
  }

  /** DP-05: the day an instant falls on in a timezone (IANA name, e.g. Asia/Ho_Chi_Minh). */
  static of(instant: Date, timeZone: string): LocalDate {
    const parts = formatter(timeZone).formatToParts(instant);
    const get = (type: string) => parts.find((p) => p.type === type)!.value;
    return new LocalDate(`${get('year')}-${get('month')}-${get('day')}`);
  }

  addDays(days: number): LocalDate {
    const [y, m, d] = this.value.split('-').map(Number);
    return new LocalDate(
      new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10),
    );
  }

  equals(other: LocalDate): boolean {
    return this.value === other.value;
  }

  isAfter(other: LocalDate): boolean {
    return this.value > other.value;
  }

  toString(): string {
    return this.value;
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** DP-05: checks an IANA timezone name sent by the phone. */
export function checkTimeZone(input: string | undefined): string {
  if (!input) throw new InvalidTimeZone(input);
  try {
    formatter(input);
    return input;
  } catch {
    throw new InvalidTimeZone(input);
  }
}
