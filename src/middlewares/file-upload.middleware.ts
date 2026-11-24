import type { RequestHandler } from 'express';
import multer from 'multer';
import { BadRequestError, PayloadTooLargeError } from '../utils/errors';

/** Name of the multipart/form-data part that holds the file. */
export const FILE_FIELD_NAME = 'file';

function formatSize(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  return Number.isInteger(megabytes) ? `${megabytes} MB` : `${bytes} bytes`;
}

/**
 * Parses a multipart/form-data upload with a single `file` part. Files are small and go straight to Blob
 * Storage, so they are kept in memory. Multer / busboy errors become API errors: a file over the limit is a
 * 413, anything else (unexpected part, malformed body...) a 400.
 */
export function createFileUpload(maxFileSizeBytes: number): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSizeBytes, files: 1, fields: 10, fieldSize: 1024 },
    // Browsers send UTF-8 file names; busboy would decode them as latin1.
    defParamCharset: 'utf8',
  }).single(FILE_FIELD_NAME);

  return (req, res, next) => {
    upload(req, res, (error: unknown) => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return next(new PayloadTooLargeError(`File must be at most ${formatSize(maxFileSizeBytes)}`));
      }
      if (error instanceof multer.MulterError) {
        return next(new BadRequestError(`Invalid file upload: ${error.message}`));
      }
      next(new BadRequestError('Malformed multipart/form-data body'));
    });
  };
}
