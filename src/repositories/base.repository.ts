import { ConflictError } from '@/errors/conflict.error'
import { NotFoundError } from '@/errors/not-found.error'
import type { BaseEntity } from '@/models/entities/base.entity'
import type { CosmosClient, PatchOperation } from '@azure/cosmos'

export abstract class BaseRepository<T extends BaseEntity> {
  protected readonly databaseName: string
  protected readonly containerName: string

  constructor(
    protected readonly client: CosmosClient,
    databaseName: string,
    containerName: string
  ) {
    this.databaseName = databaseName
    this.containerName = containerName
  }

  protected get container() {
    return this.client.database(this.databaseName).container(this.containerName)
  }

  async getById(id: string, partitionKey: string): Promise<T> {
    try {
      const { resource } = await this.container.item(id, partitionKey).read<T>()
      if (!resource) throw new NotFoundError(this.containerName, id)
      return resource
    } catch (error: unknown) {
      if (isCosmosStatus(error, 404)) throw new NotFoundError(this.containerName, id)
      throw error
    }
  }

  async create(item: T): Promise<T> {
    try {
      const { resource } = await this.container.items.create<T>(item)
      if (!resource) throw new Error('Cosmos DB returned no created item.')
      return resource
    } catch (error: unknown) {
      if (isCosmosStatus(error, 409))
        throw new ConflictError(`An item with id '${item.id}' already exists.`)
      throw error
    }
  }

  async replace(item: T, etag?: string): Promise<T> {
    try {
      const { resource } = await this.container.items.upsert<T>(item, {
        accessCondition: etag ? { condition: etag, type: 'IfMatch' } : undefined
      })
      if (!resource) throw new Error('Cosmos DB returned no replaced item.')
      return resource
    } catch (error: unknown) {
      if (isCosmosStatus(error, 412)) throw new ConflictError()
      throw error
    }
  }

  async patch(
    id: string,
    partitionKey: string,
    operations: PatchOperation[],
    etag?: string
  ): Promise<T> {
    try {
      const { resource } = await this.container.item(id, partitionKey).patch<T>(operations, {
        accessCondition: etag ? { condition: etag, type: 'IfMatch' } : undefined
      })
      if (!resource) throw new Error('Cosmos DB returned no patched item.')
      return resource
    } catch (error: unknown) {
      if (isCosmosStatus(error, 404)) throw new NotFoundError(this.containerName, id)
      if (isCosmosStatus(error, 412)) throw new ConflictError()
      throw error
    }
  }

  async upsert(item: T): Promise<T> {
    const { resource } = await this.container.items.upsert<T>(item)
    if (!resource) throw new Error('Cosmos DB returned no upserted item.')
    return resource
  }

  async delete(id: string, partitionKey: string): Promise<void> {
    try {
      await this.container.item(id, partitionKey).delete()
    } catch (error: unknown) {
      if (isCosmosStatus(error, 404)) throw new NotFoundError(this.containerName, id)
      throw error
    }
  }

  async batchDelete(ids: string[], partitionKey: string): Promise<void> {
    for (let offset = 0; offset < ids.length; offset += 100) {
      const operations = ids.slice(offset, offset + 100).map((id) => ({
        operationType: 'Delete' as const,
        id
      }))
      const response = await this.container.items.batch(operations, partitionKey)
      const failed = (response.result ?? []).some((operation) => operation.statusCode >= 400)
      if (!response.result || failed) {
        throw new ConflictError('One or more tasks could not be deleted.')
      }
    }
  }
}

function isCosmosStatus(error: unknown, statusCode: number): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === statusCode
  )
}
