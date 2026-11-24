import request from 'supertest';
import { MISSING_ID, ORG_ID, OTHER_ORG_ID, type TestContext, createTestApp } from '../helpers/test-app';

const ORG_HEADER = 'x-organization-id';

describe('Files API', () => {
  let ctx: TestContext;

  const upload = (content: Buffer | string, filename = 'notes.txt', contentType = 'text/plain') =>
    request(ctx.app)
      .post('/api/files')
      .set(ORG_HEADER, ORG_ID)
      .attach('file', Buffer.from(content), { filename, contentType });
  const download = (id: string, org = ORG_ID) => request(ctx.app).get(`/api/files/${id}`).set(ORG_HEADER, org);

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('POST /api/files', () => {
    it('201 - stores the file and returns its reference and location', async () => {
      const response = await upload('hello world').expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'File uploaded successfully',
        data: { id: expect.any(String), name: 'notes.txt', size: 11, contentType: 'text/plain' },
      });
      expect(response.body.data.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(response.headers.location).toBe(`/api/files/${response.body.data.id}`);
      expect(ctx.fileRepository.files.has(`${ORG_ID}/${response.body.data.id}`)).toBe(true);
    });

    it('201 - keeps UTF-8 file names', async () => {
      const response = await upload('x', 'résumé (final).bin', 'application/octet-stream').expect(201);
      expect(response.body.data).toMatchObject({ name: 'résumé (final).bin', contentType: 'application/octet-stream' });
    });

    it('400 - requires a file', async () => {
      const response = await request(ctx.app).post('/api/files').set(ORG_HEADER, ORG_ID).field('note', 'x').expect(400);
      expect(response.body).toMatchObject({
        success: false,
        message: 'A file is required (multipart/form-data part "file")',
        error: { code: 'BAD_REQUEST' },
      });
    });

    it('400 - rejects another part name and a malformed multipart body', async () => {
      const wrongField = await request(ctx.app)
        .post('/api/files')
        .set(ORG_HEADER, ORG_ID)
        .attach('document', Buffer.from('x'), 'a.txt')
        .expect(400);
      expect(wrongField.body.message).toBe('Invalid file upload: Unexpected file field');

      const malformed = await request(ctx.app)
        .post('/api/files')
        .set(ORG_HEADER, ORG_ID)
        .set('Content-Type', 'multipart/form-data; boundary=xyz')
        .send('--xyz\r\nContent-Disposition: form-data; name="file"; filename="a.txt"\r\n\r\nunterminated')
        .expect(400);
      expect(malformed.body.message).toBe('Malformed multipart/form-data body');
    });

    it('413 - rejects files over the configured limit', async () => {
      ctx = createTestApp({ fileMaxSizeBytes: 10 });
      const response = await upload('x'.repeat(11)).expect(413);
      expect(response.body).toMatchObject({
        message: 'File must be at most 10 bytes',
        error: { code: 'PAYLOAD_TOO_LARGE' },
      });

      const large = createTestApp({ fileMaxSizeBytes: 1_048_576 });
      const tooLarge = await request(large.app)
        .post('/api/files')
        .set(ORG_HEADER, ORG_ID)
        .attach('file', Buffer.alloc(1_048_577), 'big.bin')
        .expect(413);
      expect(tooLarge.body.message).toBe('File must be at most 1 MB');
    });

    it('422 - rejects an empty file', async () => {
      const response = await upload('').expect(422);
      expect(response.body.error).toEqual({
        code: 'VALIDATION_ERROR',
        details: [{ field: 'file', message: 'File must not be empty' }],
      });
    });

    it('400 - requires the organization header', async () => {
      await request(ctx.app).post('/api/files').attach('file', Buffer.from('x'), 'a.txt').expect(400);
    });
  });

  describe('GET /api/files/:id', () => {
    it('200 - downloads the file as an attachment that cannot run in the app origin', async () => {
      const { body } = await upload('hello world', "rapport d’été (v2)'*.txt").expect(201);

      const response = await download(body.data.id).expect(200);

      expect(response.text).toBe('hello world');
      expect(response.headers).toMatchObject({
        'content-type': 'text/plain',
        'content-length': '11',
        'content-disposition': "attachment; filename*=UTF-8''rapport%20d%E2%80%99%C3%A9t%C3%A9%20%28v2%29%27%2A.txt",
        'content-security-policy': 'sandbox',
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      });
    });

    it('404 - unknown file', async () => {
      const response = await download(MISSING_ID).expect(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('404 - file of another organization', async () => {
      const { body } = await upload('secret').expect(201);
      await download(body.data.id, OTHER_ORG_ID).expect(404);
    });

    it('400 - malformed id', async () => {
      const response = await download('not-a-uuid').expect(400);
      expect(response.body.message).toBe('Invalid file id');
    });
  });
});
