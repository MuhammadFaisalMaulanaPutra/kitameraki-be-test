export interface ResponseMeta {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface ApiResponse<T> {
  message: string
  data?: T
  meta?: ResponseMeta
}
