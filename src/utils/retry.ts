import { logger } from './logger';

export interface RetryOptions {
  retries: number;
  delayMs: number;
  label: string;
}

/** Retries an async operation with a fixed delay, e.g. while the database container is still booting. */
export async function retry<T>(operation: () => Promise<T>, { retries, delayMs, label }: RetryOptions): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt > retries) throw error;
      const reason = error instanceof Error ? error.message : String(error);
      logger.warn(`${label} failed (attempt ${attempt}/${retries + 1}): ${reason}. Retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
