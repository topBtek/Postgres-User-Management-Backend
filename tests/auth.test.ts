import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/server.js';
import { hashPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();

describe('Authentication Endpoints', () => {
  let testUser: { id: string; email: string };
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Connect to test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.refreshToken.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.emailVerificationToken.deleteMany();
    await prisma.identity.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
          metadata: {
            first_name: 'Test',
            last_name: 'User',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.role).toBe('user');

      testUser = response.body.data.user;
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should not register user with duplicate email', async () => {
      // Create a user first
      const passwordHash = await hashPassword('password123');
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
        },
      });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: '12345',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/signin', () => {
    beforeEach(async () => {
      // Create a test user
      const passwordHash = await hashPassword('password123');
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
        },
      });
    });

    it('should login user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'wrong@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    beforeEach(async () => {
      // Create a test user and get tokens
      const passwordHash = await hashPassword('password123');
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
        },
      });

      const loginResponse = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should not refresh with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      // Create a test user and get tokens
      const passwordHash = await hashPassword('password123');
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
        },
      });

      const loginResponse = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/protected', () => {
    beforeEach(async () => {
      // Create a test user and get tokens
      const passwordHash = await hashPassword('password123');
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
        },
      });

      const loginResponse = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
    });

    it('should not access protected route without token', async () => {
      const response = await request(app)
        .get('/api/protected');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
