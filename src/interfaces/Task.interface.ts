export const enum ETaskStatus {
  NOT_STARTED = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  CANCELLED = 3,
}

export interface ITask {
  name: string;
  status?: ETaskStatus;

  description?: string;

  // custom props
  [k: string]: any;
}

export interface ITaskDBStruct extends ITask {
  organizationId: number;
  status: ETaskStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskPostData extends ITask {}

export interface IPaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface IUpdateTaskStatusData {
  status: ETaskStatus;
}
