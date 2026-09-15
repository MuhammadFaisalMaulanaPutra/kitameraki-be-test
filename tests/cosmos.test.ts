import { describe, expect, it } from 'vitest';
import { TASKS_INDEXING_POLICY } from '../src/db/cosmos';

describe('Cosmos indexing policy', () => {
  it('supports deterministic task ordering with a matching composite index', () => {
    expect(TASKS_INDEXING_POLICY.compositeIndexes).toContainEqual([
      { path: '/_ts', order: 'descending' },
      { path: '/id', order: 'ascending' },
    ]);
    expect(TASKS_INDEXING_POLICY.includedPaths).toEqual(
      expect.arrayContaining([{ path: '/_ts/?' }, { path: '/id/?' }]),
    );
  });
});
