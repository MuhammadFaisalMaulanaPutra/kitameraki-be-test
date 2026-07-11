/**
 * Cosmos DB surfaces HTTP-style status codes on thrown errors. We narrow the
 * `unknown` catch value safely instead of casting to `any`.
 */
export function getCosmosStatusCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'number' ? code : undefined;
  }
  return undefined;
}

export function isCosmosNotFound(error: unknown): boolean {
  return getCosmosStatusCode(error) === 404;
}
