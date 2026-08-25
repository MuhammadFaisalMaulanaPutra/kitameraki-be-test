import type { ResponseMeta } from '@/models/responses/api-response.dto'

export function calculatePagination(page = 1, pageSize = 20, totalCount = 0): ResponseMeta {
  return {
    page,
    pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize)
  }
}
