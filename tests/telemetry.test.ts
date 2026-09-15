import { describe, expect, it } from 'vitest';
import { createRequestTelemetry, observeCosmosOperation } from '../src/telemetry';

describe('request telemetry', () => {
  it('aggregates Cosmos operation count and request charge', async () => {
    const telemetry = createRequestTelemetry();
    await observeCosmosOperation(telemetry, 'query', 'Tasks', async () => ({
      activityId: 'activity-1',
      requestCharge: 2.5,
    }));
    await observeCosmosOperation(telemetry, 'read', 'Tasks', async () => ({
      requestCharge: 1,
    }));

    expect(telemetry.snapshot()).toMatchObject({
      cosmosOperationCount: 2,
      cosmosRequestCharge: 3.5,
    });
  });

  it('records failed Cosmos operations and rethrows the original error', async () => {
    const telemetry = createRequestTelemetry();
    const error = Object.assign(new Error('failure'), {
      activityId: 'failed-activity',
      requestCharge: 1.25,
    });

    await expect(
      observeCosmosOperation(telemetry, 'replace', 'Tasks', async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(telemetry.snapshot().operations[0]).toMatchObject({
      activityId: 'failed-activity',
      failed: true,
      requestCharge: 1.25,
    });
  });
});
