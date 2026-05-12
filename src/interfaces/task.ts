export const enum TaskStatus {
  NOT_STARTED = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  CANCELLED = 3,
}

export interface Task {
  name: string;
  description?: string;
  status?: TaskStatus;
  [key: string]: any;
}

export interface TaskDocument extends Task {
  id: string;
  organizationId: number;
  status: TaskStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
