import { retry } from '../../../src/utils/retry';

describe('retry', () => {
  it('returns as soon as the operation succeeds', async () => {
    const operation = jest.fn().mockRejectedValueOnce(new Error('not ready')).mockResolvedValueOnce('ok');

    await expect(retry(operation, { retries: 3, delayMs: 1, label: 'test' })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('throws the last error after exhausting retries', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('still down'));

    await expect(retry(operation, { retries: 2, delayMs: 1, label: 'test' })).rejects.toThrow('still down');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});
