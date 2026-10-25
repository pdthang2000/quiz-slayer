/**
 * B-11: the database kept aborting a transaction because another one held the rows it
 * needed (deadlock / serialization failure), even after the automatic retries (ADR-008).
 * Technical, not a business rule: the user just tries again (409 "Try again.").
 */
export class TransactionConflict extends Error {
  readonly code = 'TransactionConflict';

  constructor(
    readonly attempts: number,
    options?: { cause?: unknown },
  ) {
    super(`Transaction aborted by a conflict ${attempts} times`, options);
    this.name = 'TransactionConflict';
  }
}
