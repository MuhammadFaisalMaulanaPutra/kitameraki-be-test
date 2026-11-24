import { Readable } from 'node:stream';
import type { ContainerClient } from '@azure/storage-blob';
import { BlobFileRepository, blobName } from '../../../src/repositories/blob/file.repository';

const ORG_ID = '5f0c9d4e-8a3b-4c2d-9e1f-7a6b5c4d3e2f';
const FILE_ID = '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c';

function storageError(statusCode: number) {
  return Object.assign(new Error(`storage ${statusCode}`), { statusCode });
}

function createContainerMock() {
  const blockBlob = { uploadData: jest.fn().mockResolvedValue({}) };
  const blob = { download: jest.fn() };
  const container = { getBlockBlobClient: jest.fn(() => blockBlob), getBlobClient: jest.fn(() => blob) };
  const repository = new BlobFileRepository(container as unknown as ContainerClient);
  return { container, blockBlob, blob, repository };
}

describe('BlobFileRepository', () => {
  it('stores the file under <organizationId>/<id> with its content type and URI-encoded name', async () => {
    const { container, blockBlob, repository } = createContainerMock();
    const content = Buffer.from('hello');

    await repository.save(ORG_ID, {
      id: FILE_ID,
      name: 'Résumé 1.pdf',
      size: 5,
      contentType: 'application/pdf',
      content,
    });

    expect(container.getBlockBlobClient).toHaveBeenCalledWith(`${ORG_ID}/${FILE_ID}`);
    expect(blockBlob.uploadData).toHaveBeenCalledWith(content, {
      blobHTTPHeaders: { blobContentType: 'application/pdf' },
      metadata: { originalname: 'R%C3%A9sum%C3%A9%201.pdf' },
    });
  });

  it('reads the content, content type and original name', async () => {
    const { container, blob, repository } = createContainerMock();
    blob.download.mockResolvedValue({
      readableStreamBody: Readable.from([Buffer.from('hel'), 'lo']),
      contentType: 'application/pdf',
      metadata: { originalname: 'R%C3%A9sum%C3%A9%201.pdf' },
    });

    const file = await repository.findById(ORG_ID, FILE_ID);

    expect(container.getBlobClient).toHaveBeenCalledWith(blobName(ORG_ID, FILE_ID));
    expect(file).toEqual({
      id: FILE_ID,
      name: 'Résumé 1.pdf',
      size: 5,
      contentType: 'application/pdf',
      content: Buffer.from('hello'),
    });
  });

  it('falls back to safe defaults when the blob has no metadata, type or body', async () => {
    const { blob, repository } = createContainerMock();
    blob.download.mockResolvedValue({ metadata: { originalname: '%E0%A4%A' } });
    await expect(repository.findById(ORG_ID, FILE_ID)).resolves.toMatchObject({
      name: '%E0%A4%A',
      size: 0,
      contentType: 'application/octet-stream',
    });

    blob.download.mockResolvedValue({});
    await expect(repository.findById(ORG_ID, FILE_ID)).resolves.toMatchObject({ name: FILE_ID });
  });

  it('returns null when the blob does not exist', async () => {
    const { blob, repository } = createContainerMock();
    blob.download.mockRejectedValue(storageError(404));
    await expect(repository.findById(ORG_ID, FILE_ID)).resolves.toBeNull();
  });

  it('propagates other storage errors', async () => {
    const { blob, repository } = createContainerMock();
    blob.download.mockRejectedValue(storageError(503));
    await expect(repository.findById(ORG_ID, FILE_ID)).rejects.toThrow('storage 503');
  });
});
