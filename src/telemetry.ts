export interface CosmosOperationMetric {
  activityId?: string;
  container: string;
  durationMs: number;
  failed: boolean;
  operation: string;
  requestCharge: number;
}

export interface RequestTelemetrySnapshot {
  cosmosOperationCount: number;
  cosmosRequestCharge: number;
  operations: CosmosOperationMetric[];
}

export interface RequestTelemetry {
  record(metric: CosmosOperationMetric): void;
  snapshot(): RequestTelemetrySnapshot;
}

interface CosmosResponseLike {
  activityId?: string;
  requestCharge?: number;
}

const readErrorMetric = (error: unknown): CosmosResponseLike => {
  if (typeof error !== 'object' || error === null) return {};
  const candidate = error as { activityId?: unknown; requestCharge?: unknown };
  return {
    activityId: typeof candidate.activityId === 'string' ? candidate.activityId : undefined,
    requestCharge:
      typeof candidate.requestCharge === 'number' ? candidate.requestCharge : undefined,
  };
};

export const createRequestTelemetry = (): RequestTelemetry => {
  const operations: CosmosOperationMetric[] = [];
  return {
    record: (metric) => operations.push(metric),
    snapshot: () => ({
      cosmosOperationCount: operations.length,
      cosmosRequestCharge: operations.reduce((total, metric) => total + metric.requestCharge, 0),
      operations: [...operations],
    }),
  };
};

export const observeCosmosOperation = async <T extends CosmosResponseLike>(
  telemetry: RequestTelemetry | undefined,
  operation: string,
  container: string,
  execute: () => Promise<T>,
): Promise<T> => {
  const startedAt = performance.now();
  try {
    const response = await execute();
    telemetry?.record({
      activityId: response.activityId,
      container,
      durationMs: performance.now() - startedAt,
      failed: false,
      operation,
      requestCharge: response.requestCharge ?? 0,
    });
    return response;
  } catch (error) {
    const metric = readErrorMetric(error);
    telemetry?.record({
      activityId: metric.activityId,
      container,
      durationMs: performance.now() - startedAt,
      failed: true,
      operation,
      requestCharge: metric.requestCharge ?? 0,
    });
    throw error;
  }
};
