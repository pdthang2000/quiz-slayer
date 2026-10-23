/** ADR-008: the application layer's way to run work in one DB transaction. */
export interface TransactionRunner {
  /** Runs `work` in one transaction. A nested call joins the outer transaction. */
  run<T>(work: () => Promise<T>): Promise<T>;
}

export const TRANSACTION_RUNNER = Symbol('TransactionRunner');
