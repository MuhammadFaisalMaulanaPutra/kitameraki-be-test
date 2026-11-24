import type { IFileRepository } from '../../../src/interfaces/file.repository.interface';
import { FileService, normalizeContentType, sanitizeFileName } from '../../../src/services/file.service';
import { NotFoundError, ValidationError } from '../../../src/utils/errors';

const ORG_ID = '5f0c9d4e-8a3b-4c2d-9e1f-7a6b5c4d3e2f';
const FILE_ID = '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c';

describe('FileService', () => {
  let repository: jest.Mocked<IFileRepository>;
  let service: FileService;

  beforeEach(() => {
    repository = { save: jest.fn().mockResolvedValue(undefined), findById: jest.fn() };
    service = new FileService(repository, () => FILE_ID);
  });

  it('stores the upload under a new id and returns its reference (without the content)', async () => {
    const content = Buffer.from('%PDF');

    const reference = await service.uploadFile(ORG_ID, {
      name: 'C:\\docs\\brief.pdf',
      contentType: 'Application/PDF',
      content,
    });

    expect(reference).toEqual({ id: FILE_ID, name: 'brief.pdf', size: 4, contentType: 'application/pdf' });
    expect(repository.save).toHaveBeenCalledWith(ORG_ID, { ...reference, content });
  });

  it('rejects an empty file', async () => {
    await expect(
      service.uploadFile(ORG_ID, { name: 'a.txt', contentType: 'text/plain', content: Buffer.alloc(0) }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('returns a stored file or throws NotFoundError', async () => {
    const file = { id: FILE_ID, name: 'a.txt', size: 1, contentType: 'text/plain', content: Buffer.from('a') };
    repository.findById.mockResolvedValueOnce(file).mockResolvedValueOnce(null);

    await expect(service.getFile(ORG_ID, FILE_ID)).resolves.toBe(file);
    await expect(service.getFile(ORG_ID, FILE_ID)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('file helpers', () => {
  it.each([
    ['../../etc/passwd', 'passwd'],
    ['folder\\report.pdf', 'report.pdf'],
    ['bad\u0000\u001f\u007fname.txt', 'badname.txt'],
    ['   ', 'file'],
    ['', 'file'],
    [`${'é'.repeat(300)}.txt`, 'é'.repeat(255)],
    [`${'x'.repeat(254)}😀`, 'x'.repeat(254)],
  ])('sanitizes the file name %j', (name, expected) => {
    expect(sanitizeFileName(name)).toBe(expected);
  });

  it.each([
    ['image/png', 'image/png'],
    [' Text/Plain ', 'text/plain'],
    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    ['', 'application/octet-stream'],
    ['not a type', 'application/octet-stream'],
    ['text/html\r\nSet-Cookie: x=1', 'application/octet-stream'],
    [`application/${'x'.repeat(300)}`, 'application/octet-stream'],
  ])('normalizes the content type %j', (contentType, expected) => {
    expect(normalizeContentType(contentType)).toBe(expected);
  });
});
