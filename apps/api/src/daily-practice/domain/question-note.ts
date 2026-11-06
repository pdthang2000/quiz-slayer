import { InvalidNoteText, NoteChanged } from './errors';
import type { QuestionId, UserId } from './ids';

/** DP-46: counted like CARD-02, in code points after NFC + trim. */
export const NOTE_MAX = 1000;

/** DP-46: NFC, spaces trimmed at both ends, at most 1,000 characters; may be empty. */
export function noteText(input: string): string {
  const text = input.normalize('NFC').trim();
  if ([...text].length > NOTE_MAX) throw new InvalidNoteText();
  return text;
}

export type QuestionNoteSnapshot = {
  userId: UserId;
  questionId: QuestionId;
  /** Empty = the note was removed (DP-46); the row stays so its version keeps counting. */
  text: string;
  version: number;
};

/**
 * The user's private note on one question (DP-41, DP-42), one per user and question, kept
 * across days and tracks (DP-43, DP-44). Not part of a session: it is keyed by the question,
 * so it survives a fix to the question's content (DP-51).
 *
 * Version 0 means nothing is stored yet. Removing keeps the row and its version, so a phone
 * that still shows the removed note can't overwrite a newer one that reused its number
 * (DP-50, CONFLICT-01).
 */
export class QuestionNote {
  private constructor(private s: QuestionNoteSnapshot) {}

  /** No note yet: what a question without a stored note looks like. */
  static none(userId: UserId, questionId: QuestionId): QuestionNote {
    return new QuestionNote({ userId, questionId, text: '', version: 0 });
  }

  /** Rebuilds a stored note. Only infrastructure mappers call this. */
  static reconstitute(s: QuestionNoteSnapshot): QuestionNote {
    return new QuestionNote({ ...s });
  }

  get userId() {
    return this.s.userId;
  }
  get questionId() {
    return this.s.questionId;
  }
  get version() {
    return this.s.version;
  }
  /** null = no note. */
  get text(): string | null {
    return this.s.text === '' ? null : this.s.text;
  }
  get isStored(): boolean {
    return this.s.version > 0;
  }

  /**
   * DP-46: writes the note; empty text removes it. DP-50: `version` is the one the screen
   * showed; outdated → NoteChanged and nothing is written.
   */
  write(input: string, version: number): void {
    const text = noteText(input);
    if (version !== this.s.version) throw new NoteChanged();
    this.s = { ...this.s, text };
  }

  toSnapshot(): QuestionNoteSnapshot {
    return { ...this.s };
  }
}
