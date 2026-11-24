import { randomUUID } from 'node:crypto';
import type { IFileRepository, StoredFile } from '../interfaces/file.repository.interface';
import type { FileReference } from '../models/form-settings.model';
import { NotFoundError, ValidationError } from '../utils/errors';

export const DEFAULT_CONTENT_TYPE = 'application/octet-stream';
export const MAX_FILE_NAME_LENGTH = 255;
/** `type/subtype` with RFC 6838 characters only, so the stored value is always a safe response header. */
const CONTENT_TYPE_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;

/** A file received by the upload endpoint. */
export interface FileUpload {
  name: string;
  contentType: string;
  content: Buffer;
}

/**
 * Keeps the last path segment, drops control characters and limits the length (without splitting a
 * character), so the name is safe in metadata and in the Content-Disposition header.
 */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  let result = '';
  for (const char of base) {
    if (char < ' ' || char === '\u007f') continue;
    if (result.length + char.length > MAX_FILE_NAME_LENGTH) break;
    result += char;
  }
  return result.trim() || 'file';
}

export function normalizeContentType(contentType: string): string {
  const value = contentType.trim().toLowerCase();
  return value.length <= 255 && CONTENT_TYPE_PATTERN.test(value) ? value : DEFAULT_CONTENT_TYPE;
}

export class FileService {
  constructor(
    private readonly fileRepository: IFileRepository,
    private readonly generateId: () => string = randomUUID,
  ) {}

  /** Stores an uploaded file under a new random id. */
  async uploadFile(organizationId: string, upload: FileUpload): Promise<FileReference> {
    if (upload.content.length === 0) {
      throw new ValidationError([{ field: 'file', message: 'File must not be empty' }]);
    }

    const file: StoredFile = {
      id: this.generateId(),
      name: sanitizeFileName(upload.name),
      size: upload.content.length,
      contentType: normalizeContentType(upload.contentType),
      content: upload.content,
    };
    await this.fileRepository.save(organizationId, file);

    const { content: _content, ...reference } = file;
    return reference;
  }

  async getFile(organizationId: string, id: string): Promise<StoredFile> {
    const file = await this.fileRepository.findById(organizationId, id);
    if (!file) throw new NotFoundError(`File with id "${id}" was not found`);
    return file;
  }
}
