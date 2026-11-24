import type { Container } from '@azure/cosmos';
import type { Task } from '../../../src/models/task.model';
import { CosmosTaskRepository, buildWhereClause } from '../../../src/repositories/cosmos/task.repository';

const ORG_ID = '5f0c9d4e-8a3b-4c2d-9e1f-7a6b5c4d3e2f';

const storedTask = {
  id: 't1',
  organizationId: ORG_ID,
  title: 'Task',
  status: 'todo',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  _rid: 'rid',
  _self: 'self',
  _etag: 'etag',
  _attachments: 'attachments/',
  _ts: 1,
};

function cosmosError(code: number) {
  return Object.assign(new Error(`cosmos ${code}`), { code });
}

function createContainerMock() {
  const item = { read: jest.fn(), replace: jest.fn(), delete: jest.fn() };
  const query = jest.fn();
  const container = {
    item: jest.fn(() => item),
    items: { query, create: jest.fn() },
  };
  return { container, item, query };
}

describe('buildWhereClause', () => {
  it('always scopes by organization', () => {
    expect(buildWhereClause(ORG_ID, {})).toEqual({
      where: 'c.organizationId = @organizationId',
      parameters: [{ name: '@organizationId', value: ORG_ID }],
    });
  });

  it('uses parameters for every user supplied value (no SQL injection)', () => {
    const malicious = "x' OR 1=1 --";
    const { where, parameters } = buildWhereClause(ORG_ID, {
      search: malicious,
      status: 'todo',
      priority: 'high',
      tag: malicious,
    });

    expect(where).not.toContain(malicious);
    expect(where).toContain('c.status = @status');
    expect(where).toContain('c.priority = @priority');
    expect(where).toContain('ARRAY_CONTAINS(c.tags, @tag)');
    expect(where).toContain('CONTAINS(LOWER(c.title), @search)');
    expect(parameters).toEqual(
      expect.arrayContaining([
        { name: '@search', value: malicious.toLowerCase() },
        { name: '@tag', value: malicious },
      ]),
    );
  });
});

describe('CosmosTaskRepository', () => {
  it('findMany runs a paged query and a count query in the organization partition', async () => {
    const { container, query } = createContainerMock();
    query
      .mockReturnValueOnce({ fetchAll: jest.fn().mockResolvedValue({ resources: [storedTask] }) })
      .mockReturnValueOnce({ fetchAll: jest.fn().mockResolvedValue({ resources: [11] }) });
    const repository = new CosmosTaskRepository(container as unknown as Container);

    const result = await repository.findMany(ORG_ID, {
      filter: { status: 'todo' },
      sort: { sortBy: 'title', sortOrder: 'asc' },
      pagination: { page: 3, pageSize: 5 },
    });

    const [itemsSpec, itemsOptions] = query.mock.calls[0];
    expect(itemsSpec.query).toBe(
      'SELECT * FROM c WHERE c.organizationId = @organizationId AND c.status = @status ORDER BY c.title ASC OFFSET @offset LIMIT @limit',
    );
    expect(itemsSpec.parameters).toEqual(
      expect.arrayContaining([
        { name: '@offset', value: 10 },
        { name: '@limit', value: 5 },
      ]),
    );
    expect(itemsOptions).toEqual({ partitionKey: ORG_ID });
    expect(query.mock.calls[1][0].query).toBe(
      'SELECT VALUE COUNT(1) FROM c WHERE c.organizationId = @organizationId AND c.status = @status',
    );

    expect(result.totalItems).toBe(11);
    expect(result.items[0]).not.toHaveProperty('_rid');
    expect(result.items[0]).toMatchObject({ id: 't1', tags: [], customFields: {} });
  });

  it('findById returns null for a missing item', async () => {
    const { container, item } = createContainerMock();
    item.read.mockResolvedValue({ resource: undefined, statusCode: 404 });
    const repository = new CosmosTaskRepository(container as unknown as Container);

    await expect(repository.findById(ORG_ID, 'missing')).resolves.toBeNull();
    expect(container.item).toHaveBeenCalledWith('missing', ORG_ID);
  });

  it('findById returns null when the SDK throws 404', async () => {
    const { container, item } = createContainerMock();
    item.read.mockRejectedValue(cosmosError(404));
    const repository = new CosmosTaskRepository(container as unknown as Container);

    await expect(repository.findById(ORG_ID, 'missing')).resolves.toBeNull();
  });

  it('findById rethrows unexpected errors', async () => {
    const { container, item } = createContainerMock();
    item.read.mockRejectedValue(cosmosError(503));
    const repository = new CosmosTaskRepository(container as unknown as Container);

    await expect(repository.findById(ORG_ID, 't1')).rejects.toThrow('cosmos 503');
  });

  it('create strips Cosmos system properties', async () => {
    const { container } = createContainerMock();
    container.items.create.mockResolvedValue({ resource: storedTask });
    const repository = new CosmosTaskRepository(container as unknown as Container);

    const created = await repository.create(storedTask as unknown as Task);

    expect(created).not.toHaveProperty('_etag');
  });

  it('update replaces the item in its partition', async () => {
    const { container, item } = createContainerMock();
    item.replace.mockResolvedValue({ resource: storedTask });
    const repository = new CosmosTaskRepository(container as unknown as Container);

    await repository.update(storedTask as unknown as Task);

    expect(container.item).toHaveBeenCalledWith('t1', ORG_ID);
    expect(item.replace).toHaveBeenCalledWith(storedTask);
  });

  it('delete returns true on success and false on 404', async () => {
    const { container, item } = createContainerMock();
    const repository = new CosmosTaskRepository(container as unknown as Container);

    item.delete.mockResolvedValueOnce({});
    await expect(repository.delete(ORG_ID, 't1')).resolves.toBe(true);

    item.delete.mockRejectedValueOnce(cosmosError(404));
    await expect(repository.delete(ORG_ID, 't1')).resolves.toBe(false);

    item.delete.mockRejectedValueOnce(cosmosError(500));
    await expect(repository.delete(ORG_ID, 't1')).rejects.toThrow('cosmos 500');
  });
});
