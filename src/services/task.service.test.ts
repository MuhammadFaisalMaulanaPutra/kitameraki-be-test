import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskService } from './task.service.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { BadRequestError, NotFoundError } from '../utils/errors.util.js';
import { Task } from '../models/task.model.js';
import { randomUUID } from 'node:crypto';

describe('TaskService Unit Tests', () => {
    let taskService: TaskService;
    let mockRepo: Partial<TaskRepository>;
    const mockOrgId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
    const mockTaskId = '11111111-2222-3333-4444-555555555555';
    const mockTask: Task = {
        id: mockTaskId,
        organizationId: mockOrgId,
        title: 'Task Pengujian',
        description: 'Deskripsi pengujian',
        priority: 'medium',
        status: 'todo',
        tags: ['test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    beforeEach(() => {
        mockRepo = {
            create: vi.fn().mockImplementation((task) => Promise.resolve(task)),
            findById: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            bulkDelete: vi.fn(),
            findWithFilters: vi.fn(),
        };
        taskService = new TaskService(mockRepo as TaskRepository);
    });

    describe('createTask', () => {
        it('harus berhasil membuat task dengan default value dari Zod', async () => {
            const input = {
                organizationId: mockOrgId,
                title: 'Task Baru Valid',
            };
            const result = await taskService.createTask(input);
            expect(result.title).toBe('Task Baru Valid');
            expect(result.status).toBe('todo');
            expect(result.priority).toBe('medium');
            expect(result.id).toBeDefined();
            expect(result.createdAt).toBeDefined();
            expect(mockRepo.create).toHaveBeenCalledTimes(1);
        });
        it('harus melempar BadRequestError jika title kosong atau hanya spasi', async () => {
            const input = {
                organizationId: mockOrgId,
                title: '   ',
            };
            await expect(taskService.createTask(input)).rejects.toThrow(BadRequestError);
            expect(mockRepo.create).not.toHaveBeenCalled();
        });
        it('harus melempar BadRequestError jika title melebihi 100 karakter', async () => {
            const input = {
                organizationId: mockOrgId,
                title: 'A'.repeat(101),
            };
            await expect(taskService.createTask(input)).rejects.toThrow(BadRequestError);
        });
        it('harus melempar BadRequestError jika organizationId bukan format UUID', async () => {
            const input = {
                organizationId: '123-bukan-uuid',
                title: 'Valid Title',
            };
            await expect(taskService.createTask(input)).rejects.toThrow(BadRequestError);
        });
    });

    describe('getTaskById', () => {
        it('harus mengembalikan task jika ditemukan di repository', async () => {
            (mockRepo.findById as any).mockResolvedValue(mockTask);
            const result = await taskService.getTaskById(mockTaskId, mockOrgId);
            expect(result).toEqual(mockTask);
            expect(mockRepo.findById).toHaveBeenCalledWith(mockTaskId, mockOrgId);
        });
        it('harus melempar NotFoundError jika task tidak ditemukan di repository', async () => {
            (mockRepo.findById as any).mockResolvedValue(null);
            await expect(taskService.getTaskById(mockTaskId, mockOrgId)).rejects.toThrow(
                NotFoundError
            );
        });
        it('harus melempar BadRequestError jika parameter id kosong', async () => {
            await expect(taskService.getTaskById('', mockOrgId)).rejects.toThrow(BadRequestError);
        });
    });

    describe('getTasks', () => {
        it('harus memanggil repository dengan pagination dan sorting yang sudah di-parse Zod', async () => {
            const mockPaginatedResult = {
                items: [mockTask],
                total: 1,
                page: 2,
                pageSize: 10,
                totalPages: 1,
            };
            (mockRepo.findWithFilters as any).mockResolvedValue(mockPaginatedResult);
            const queryInput = {
                organizationId: mockOrgId,
                page: '2',
                pageSize: '10',
                sortBy: 'dueDate',
                sortOrder: 'asc',
            };
            const result = await taskService.getTasks(queryInput);
            expect(result).toEqual(mockPaginatedResult);
            expect(mockRepo.findWithFilters).toHaveBeenCalledWith(
                expect.objectContaining({
                    organizationId: mockOrgId,
                    page: 2,
                    pageSize: 10,
                    sortBy: 'dueDate',
                    sortOrder: 'asc',
                })
            );
        });
        it('harus melempar BadRequestError jika organizationId tidak disertakan', async () => {
            await expect(taskService.getTasks({})).rejects.toThrow(BadRequestError);
        });
    });

    describe('updateTask', () => {
        it('harus berhasil mengupdate task jika data ada di repository', async () => {
            const updatedTask = { ...mockTask, title: 'Judul Baru Diupdate' };
            (mockRepo.findById as any).mockResolvedValue(mockTask);
            (mockRepo.update as any).mockResolvedValue(updatedTask);
            const result = await taskService.updateTask(mockTaskId, mockOrgId, {
                title: 'Judul Baru Diupdate',
            });
            expect(result.title).toBe('Judul Baru Diupdate');
            expect(mockRepo.update).toHaveBeenCalledWith(
                mockTaskId,
                mockOrgId,
                expect.objectContaining({ title: 'Judul Baru Diupdate' })
            );
        });
        it('harus melempar NotFoundError jika task tidak ada di database saat mau diupdate', async () => {
            (mockRepo.findById as any).mockResolvedValue(null);
            await expect(
                taskService.updateTask(mockTaskId, mockOrgId, { title: 'Judul Baru' })
            ).rejects.toThrow(NotFoundError);
            expect(mockRepo.update).not.toHaveBeenCalled();
        });
        it('harus melempar BadRequestError jika payload update kosong', async () => {
            (mockRepo.findById as any).mockResolvedValue(mockTask);
            await expect(taskService.updateTask(mockTaskId, mockOrgId, {})).rejects.toThrow(
                BadRequestError
            );
        });
    });

    describe('deleteTask', () => {
        it('harus berhasil jika repository mengembalikan true', async () => {
            (mockRepo.delete as any).mockResolvedValue(true);
            await expect(taskService.deleteTask(mockTaskId, mockOrgId)).resolves.not.toThrow();
            expect(mockRepo.delete).toHaveBeenCalledWith(mockTaskId, mockOrgId);
        });
        it('harus melempar NotFoundError jika task yang mau dihapus tidak ada (repo return false)', async () => {
            (mockRepo.delete as any).mockResolvedValue(false);
            await expect(taskService.deleteTask(mockTaskId, mockOrgId)).rejects.toThrow(
                NotFoundError
            );
        });
    });

    describe('bulkDeleteTasks', () => {
        it('harus berhasil menghapus banyak task jika array UUID valid', async () => {
            (mockRepo.bulkDelete as any).mockResolvedValue(2);
            const ids = [randomUUID(), randomUUID()];
            const result = await taskService.bulkDeleteTasks(ids, mockOrgId);
            expect(result.deletedCount).toBe(2);
            expect(mockRepo.bulkDelete).toHaveBeenCalledWith(ids, mockOrgId);
        });
        it('harus melempar BadRequestError jika array id kosong', async () => {
            await expect(taskService.bulkDeleteTasks([], mockOrgId)).rejects.toThrow(
                BadRequestError
            );
        });
    });
});