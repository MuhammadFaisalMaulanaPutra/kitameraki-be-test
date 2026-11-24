import type { Request, Response } from 'express';
import { FILE_FIELD_NAME } from '../middlewares/file-upload.middleware';
import { getOrganizationId } from '../middlewares/organization-context.middleware';
import type { FileService } from '../services/file.service';
import { BadRequestError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { idParamSchema } from '../validators/common.validator';
import { validateParams } from '../validators/validate';

/** RFC 5987 encoding (`filename*=UTF-8''...`): encodeURIComponent plus the characters it leaves as is. */
function encodeHeaderParameter(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export class FileController {
  constructor(private readonly fileService: FileService) {}

  /** POST /files (multipart/form-data, parsed by the file-upload middleware). */
  upload = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw new BadRequestError(`A file is required (multipart/form-data part "${FILE_FIELD_NAME}")`);
    }

    const file = await this.fileService.uploadFile(getOrganizationId(req), {
      name: req.file.originalname,
      contentType: req.file.mimetype,
      content: req.file.buffer,
    });
    res.location(`${req.baseUrl}/${file.id}`);
    sendSuccess(res, 201, 'File uploaded successfully', file);
  };

  /**
   * GET /files/:id. Always a download: uploaded content must never run in the app origin, hence
   * `Content-Disposition: attachment` and a sandboxing Content-Security-Policy (nosniff comes from helmet).
   */
  download = async (req: Request, res: Response): Promise<void> => {
    const { id } = validateParams(idParamSchema, req.params, 'Invalid file id');
    const file = await this.fileService.getFile(getOrganizationId(req), id);

    // setHeader, not res.set: Express would append "charset=utf-8" to text types, but the bytes are sent as uploaded.
    res.setHeader('Content-Type', file.contentType);
    res.set({
      'Content-Length': String(file.content.length),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeHeaderParameter(file.name)}`,
      'Content-Security-Policy': 'sandbox',
      'Cache-Control': 'private, no-store',
    });
    res.status(200).send(file.content);
  };
}
