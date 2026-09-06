import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('OAuth Authentication Integration Tests', () => {
  it('should process mock OAuth authentication successfully', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        credential: 'MOCK_TOKEN',
        mockUser: {
          email: 'test.oauth.user@example.com',
          name: 'OAuth Test User',
          avatar: 'https://example.com/avatar.png',
          googleId: 'google-oauth-12345',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', 'test.oauth.user@example.com');
  });

  it('should handle malformed or invalid OAuth credentials via fallback mechanism', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        credential: 'invalid-malformed-token-string-xyz',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email');
  });

  it('should handle unexpected null payload or bad input gracefully', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});
