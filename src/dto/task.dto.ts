export type TaskResponseDto = {
  id: string;
  title: string;
  status: string;
  organizationId: string;
};

export type TaskListResponseDto = {
  data: TaskResponseDto[];
  total: number;
  page: number;
  limit: number;
};

export type TaskRequestDto = {
  title: string;
  status?: string;
  organizationId: string;
};

export type UpdateTaskDto = {
  title?: string;
  status?: string;
};

export type BulkDeleteItemDto = {
  id: string;
  organizationId: string;
};