import type { NextFunction, Request, Response } from 'express';
import { errorHandler, notFoundHandler } from '../../../src/middlewares/error-handler.middleware';
import { BadRequestError, NotFoundError, ValidationError } from '../../../src/utils/errors';

function createResponse() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

const req = { method: 'GET', originalUrl: '/api/tasks', path: '/api/tasks' } as Request;
const next = jest.fn() as NextFunction;

describe('errorHandler', () => {
  it.each([
    [new BadRequestError('bad'), 400, 'BAD_REQUEST'],
    [new NotFoundError('missing'), 404, 'NOT_FOUND'],
    [new ValidationError([{ field: 'title', message: 'Title is required' }]), 422, 'VALIDATION_ERROR'],
  ])('maps %p to its status code', (error, status, code) => {
    const res = createResponse();

    errorHandler(error, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ code }) }),
    );
  });

  it('includes validation details', () => {
    const res = createResponse();
    errorHandler(
      new ValidationError([{ field: 'title', message: 'Title is required' }]),
      req,
      res as unknown as Response,
      next,
    );

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      error: { code: 'VALIDATION_ERROR', details: [{ field: 'title', message: 'Title is required' }] },
    });
  });

  it('maps malformed JSON to 400', () => {
    const res = createResponse();
    errorHandler({ type: 'entity.parse.failed', status: 400 }, req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: { code: 'INVALID_JSON' } }));
  });

  it('maps oversized payloads to 413', () => {
    const res = createResponse();
    errorHandler({ type: 'entity.too.large', status: 413 }, req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(413);
  });

  it('hides unexpected errors behind a generic 500', () => {
    const res = createResponse();

    errorHandler(new Error('Connection string: AccountKey=secret'), req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
      error: { code: 'INTERNAL_SERVER_ERROR' },
    });
    expect(JSON.stringify(body)).not.toContain('secret');
  });
});

describe('notFoundHandler', () => {
  it('responds with 404 ROUTE_NOT_FOUND', () => {
    const res = createResponse();
    notFoundHandler(req, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: { code: 'ROUTE_NOT_FOUND' } }));
  });
});
