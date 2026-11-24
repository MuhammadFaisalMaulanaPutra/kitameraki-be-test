import type { FileReference } from '../models/form-settings.model';

/** An uploaded file with its content (files are small: they are kept in memory). */
export interface StoredFile extends FileReference {
  content: Buffer;
}

/**
 * Persistence contract for uploaded files (File picker values, Document preview sources).
 * Files are scoped to an organization: an id of another organization is never found.
 */
export interface IFileRepository {
  save(organizationId: string, file: StoredFile): Promise<void>;
  /** @returns `null` when the file does not exist in the organization. */
  findById(organizationId: string, id: string): Promise<StoredFile | null>;
}
