export function calculatePagination(page: number, pageSize: number, totalCount: number) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  }
}
