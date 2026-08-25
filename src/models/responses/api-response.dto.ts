export interface ApiResponse<T> {
  success: true
  statusCode: number
  data: T
  meta?: Record<string, unknown>
  timestamp: string
}

export interface PaginatedResponse<T> {
  success: true
  statusCode: number
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  timestamp: string
}
