import { ConflictError } from '@/errors/conflict.error'
import { NotFoundError } from '@/errors/not-found.error'
import type { BaseEntity } from '@/models/entities/base.entity'
import type { OperationInput } from '@azure/cosmos'
import { type CosmosClient, type PatchOperation, StatusCodes } from '@azure/cosmos'

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

  async getById(id: string, partitionKey: string | string[]): Promise<T> {
    try {
      const { resource } = await this.container.item(id, partitionKey).read<T>()
      if (!resource) throw new NotFoundError(this.containerName, id)
      return resource
    } catch (error: unknown) {
      if (isCosmosStatus(error, StatusCodes.NotFound)) {
        throw new NotFoundError(this.containerName, id)
      }

      throw error
    }
  }

  async create(item: T): Promise<T> {
    try {
      const { resource } = await this.container.items.create<T>(item)
      if (!resource) throw new Error('Cosmos DB returned no created item.')
      return resource
    } catch (error: unknown) {
      if (isCosmosStatus(error, StatusCodes.Conflict)) {
        throw new ConflictError(`An item with id '${item.id}' already exists.`)
      }

      throw error
    }
  }

  async replace(item: T): Promise<T> {
    try {
      const { resource } = await this.container.items.upsert<T>(item)
      if (!resource) throw new Error('Cosmos DB returned no replaced item.')
      return resource
    } catch (error: unknown) {
      if (isCosmosStatus(error, StatusCodes.PreconditionFailed)) {
        throw new ConflictError()
      }

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
      if (isCosmosStatus(error, StatusCodes.NotFound)) {
        throw new NotFoundError(this.containerName, id)
      }

      if (isCosmosStatus(error, StatusCodes.PreconditionFailed)) {
        throw new ConflictError()
      }

      throw error
    }
  }

  async upsert(item: T): Promise<T> {
    const { resource } = await this.container.items.upsert<T>(item)
    if (!resource) throw new Error('Cosmos DB returned no upserted item.')
    return resource
  }

  async delete(id: string, partitionKey: string | string[]): Promise<void> {
    try {
      await this.container.item(id, partitionKey).delete()
    } catch (error: unknown) {
      if (isCosmosStatus(error, StatusCodes.NotFound)) {
        throw new NotFoundError(this.containerName, id)
      }

      throw error
    }
  }

  async batchDelete(ids: string[], partitionKey: string): Promise<void> {
    if (ids.length === 0) return

    const operations: OperationInput[] = ids.map((id) => ({
      operationType: 'Delete',
      id: id,
      partitionKey: [partitionKey, id]
    }))

    const results = await this.container.items.executeBulkOperations(operations)

    const failures = results.filter((result) => {
      if (result.error) return true
      const status = result.response?.statusCode
      return status && status >= 400
    })

    if (failures.length === 0) return

    const notFoundFailure = failures.find((result) => {
      return (
        result.response?.statusCode === StatusCodes.NotFound ||
        result.error?.code === StatusCodes.NotFound
      )
    })

    if (notFoundFailure) {
      throw new NotFoundError(this.containerName, 'One or more tasks could not be found.')
    }

    throw new ConflictError('One or more tasks could not be deleted.')
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
