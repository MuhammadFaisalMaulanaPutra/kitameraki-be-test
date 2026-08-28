import { promises as fs } from 'node:fs';
import path from 'node:path';

export class JsonFileStore<T> {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async read(): Promise<T[]> {
    return this.readInternal();
  }

  async update<R>(mutator: (items: T[]) => R | Promise<R>): Promise<R> {
    const operation = this.queue.then(async () => {
      const items = await this.readInternal();
      const result = await mutator(items);
      await this.writeInternal(items);
      return result;
    });

    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );

    return operation;
  }

  private async readInternal(): Promise<T[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error(`Expected an array in ${this.filePath}.`);
      }
      return parsed as T[];
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async writeInternal(items: T[]): Promise<void> {
    const directory = path.dirname(this.filePath);
    await fs.mkdir(directory, { recursive: true });

    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
    await fs.rename(tempPath, this.filePath);
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
