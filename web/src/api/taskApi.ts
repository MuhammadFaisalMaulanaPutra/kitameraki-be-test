import { CreateTaskInput, FormSettings, PaginatedTasks, Task, TaskQuery } from '../types/task';

function withFunctionKey(url: string): string {
  const functionKey = import.meta.env.VITE_FUNCTION_KEY as string | undefined;
  if (!functionKey) return url;
  return `${url}${url.includes('?') ? '&' : '?'}code=${encodeURIComponent(functionKey)}`;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(withFunctionKey(url), {
    ...options,
    headers: { 'content-type': 'application/json', ...options?.headers }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? 'Unable to complete the request');
  }

  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export function getTasks(query: TaskQuery): Promise<PaginatedTasks> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.priority) params.set('priority', query.priority);
  return request<PaginatedTasks>(`/api/tasks?${params.toString()}`);
}

export function createTask(input: CreateTaskInput) {
  return request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(input) });
}

export function updateTask(id: string, input: Partial<CreateTaskInput>) {
  return request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteTask(id: string) {
  return request<void>(`/api/tasks/${id}`, { method: 'DELETE' });
}

export function getFormSettings() {
  return request<FormSettings>('/api/form-settings');
}

export function saveFormSettings(settings: Pick<FormSettings, 'fields'>) {
  return request<FormSettings>('/api/form-settings', { method: 'PUT', body: JSON.stringify(settings) });
}
