import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('CSV Lead List Parser Integration Tests', () => {
  it('should return 400 error when textContent parameter is missing', async () => {
    const res = await request(app)
      .post('/api/emails/parse-csv')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'textContent string is required');
  });

  it('should return 400 error when textContent is not a string type', async () => {
    const res = await request(app)
      .post('/api/emails/parse-csv')
      .send({ textContent: 12345 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'textContent string is required');
  });

  it('should return 400 error when textContent is an array or object', async () => {
    const res = await request(app)
      .post('/api/emails/parse-csv')
      .send({ textContent: ['test@example.com'] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'textContent string is required');
  });

  it('should return 0 emails when input text contains no valid email pattern', async () => {
    const res = await request(app)
      .post('/api/emails/parse-csv')
      .send({ textContent: 'hello world! no emails in this plain text list.' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalCount: 0,
      emails: [],
    });
  });

  it('should extract, deduplicate, and normalize emails from raw text/CSV input', async () => {
    const rawCsv = `
      Header, Email, Name
      1, Alice@Domain.COM, Alice
      2, bob.smith@company.org, Bob
      3, ALICE@DOMAIN.COM, Alice Duplicate
      Invalid text line without email
      4, Charlie+newsletter@service.co.uk, Charlie
    `;

    const res = await request(app)
      .post('/api/emails/parse-csv')
      .send({ textContent: rawCsv });

    expect(res.status).toBe(200);
    expect(res.body.totalCount).toBe(3);
    expect(res.body.emails).toEqual([
      'alice@domain.com',
      'bob.smith@company.org',
      'charlie+newsletter@service.co.uk',
    ]);
  });
});
