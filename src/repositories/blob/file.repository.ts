import type { ContainerClient } from '@azure/storage-blob';
import type { IFileRepository, StoredFile } from '../../interfaces/file.repository.interface';

/** Blob metadata entry holding the original file name. */
const NAME_METADATA = 'originalname';
const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

/** One virtual folder per organization: `<organizationId>/<fileId>`. */
export function blobName(organizationId: string, id: string): string {
  return `${organizationId}/${id}`;
}

/** Storage SDK errors (RestError) carry the HTTP status of the failed operation in `statusCode`. */
function isBlobNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { statusCode?: unknown }).statusCode === 404;
}

async function readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

function decodeName(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Stores uploaded files as block blobs in Azure Blob Storage (Azurite locally). */
export class BlobFileRepository implements IFileRepository {
  constructor(private readonly container: ContainerClient) {}

  async save(organizationId: string, file: StoredFile): Promise<void> {
    await this.container.getBlockBlobClient(blobName(organizationId, file.id)).uploadData(file.content, {
      blobHTTPHeaders: { blobContentType: file.contentType },
      // Metadata values must be ASCII: the original name is URI-encoded.
      metadata: { [NAME_METADATA]: encodeURIComponent(file.name) },
    });
  }

  async findById(organizationId: string, id: string): Promise<StoredFile | null> {
    try {
      const response = await this.container.getBlobClient(blobName(organizationId, id)).download();
      const content = response.readableStreamBody ? await readStream(response.readableStreamBody) : Buffer.alloc(0);
      return {
        id,
        name: decodeName(response.metadata?.[NAME_METADATA], id),
        size: content.length,
        contentType: response.contentType || DEFAULT_CONTENT_TYPE,
        content,
      };
    } catch (error) {
      if (isBlobNotFound(error)) return null;
      throw error;
    }
  }
}
