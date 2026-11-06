import { InvalidNoteText, NoteChanged } from './errors';
import { QuestionId, UserId } from './ids';
import { NOTE_MAX, QuestionNote } from './question-note';

const USER = UserId('u1');
const QUESTION = QuestionId('q1');
const none = () => QuestionNote.none(USER, QUESTION);
const stored = (text: string, version: number) =>
  // eslint-disable-next-line no-restricted-syntax
  QuestionNote.reconstitute({
    userId: USER,
    questionId: QUESTION,
    text,
    version,
  });

describe('QuestionNote', () => {
  it('DP-46: at most 1,000 characters, counted in code points after NFC', () => {
    const note = none();
    expect(() => note.write('好'.repeat(NOTE_MAX), 0)).not.toThrow();
    expect(() => none().write('😀'.repeat(NOTE_MAX), 0)).not.toThrow();
    expect(() => none().write('a'.repeat(NOTE_MAX + 1), 0)).toThrow(
      InvalidNoteText,
    );
    expect(() => none().write('é'.repeat(NOTE_MAX), 0)).not.toThrow(); // é once NFC
  });

  it('DP-46: spaces are trimmed at both ends and do not count', () => {
    const note = none();
    note.write(`  ${'a'.repeat(NOTE_MAX)}\n`, 0);
    expect(note.text).toHaveLength(NOTE_MAX);
    expect(note.text?.startsWith(' ')).toBe(false);
  });

  it('DP-46: saving an empty note removes it', () => {
    const note = stored('old', 3);
    note.write('   ', 3);
    expect(note.text).toBeNull();
    expect(note.isStored).toBe(true); // the version keeps counting (DP-50)
  });

  it('DP-50: an outdated version → NoteChanged and nothing is written', () => {
    const note = stored('X', 2);
    expect(() => note.write('Y', 1)).toThrow(NoteChanged);
    expect(note.text).toBe('X');
  });

  it('DP-50: no note yet is version 0', () => {
    expect(() => none().write('first', 1)).toThrow(NoteChanged);
    expect(none().isStored).toBe(false);
    expect(none().text).toBeNull();
  });
});
