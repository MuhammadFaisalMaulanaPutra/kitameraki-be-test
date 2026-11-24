import type { Request, Response } from 'express';
import { getOrganizationId, organizationContext } from '../../../src/middlewares/organization-context.middleware';
import { BadRequestError } from '../../../src/utils/errors';

const ORG_ID = '5f0c9d4e-8a3b-4c2d-9e1f-7a6b5c4d3e2f';

function requestWithHeader(value?: string): Request {
  return { header: jest.fn(() => value) } as unknown as Request;
}

describe('organizationContext middleware', () => {
  it('stores the organization id and calls next', () => {
    const req = requestWithHeader(ORG_ID);
    const next = jest.fn();

    organizationContext(req, {} as Response, next);

    expect(req.organizationId).toBe(ORG_ID);
    expect(getOrganizationId(req)).toBe(ORG_ID);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a missing header', () => {
    expect(() => organizationContext(requestWithHeader(undefined), {} as Response, jest.fn())).toThrow(BadRequestError);
  });

  it('rejects a non-UUID header', () => {
    expect(() => organizationContext(requestWithHeader("1' OR '1'='1"), {} as Response, jest.fn())).toThrow(
      'header must be a valid UUID',
    );
  });

  it('getOrganizationId fails loudly when the middleware was not applied', () => {
    expect(() => getOrganizationId({} as Request)).toThrow('organizationContext middleware is not registered');
  });
});
