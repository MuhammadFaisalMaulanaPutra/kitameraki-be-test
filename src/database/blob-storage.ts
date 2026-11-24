import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';
import type { StorageConfig } from '../config/env';

/** The container reference is resolved lazily by the SDK; no network call happens here. */
export function createFilesContainerClient(config: StorageConfig): ContainerClient {
  return BlobServiceClient.fromConnectionString(config.connectionString).getContainerClient(config.filesContainer);
}

/** Creates the files container when missing (idempotent). It stays private: files are served by the API only. */
export async function ensureFilesContainer(container: ContainerClient): Promise<void> {
  await container.createIfNotExists();
}
