const request = require('supertest');
const app = require('../src/app');
const { setupDatabase, teardownDatabase } = require('./setup');
const { generateToken } = require('../src/services/authService');

let adminUser;
let adminToken;
let viewerToken;

beforeAll(async () => {
  const result = await setupDatabase();
  adminUser = result.adminUser;

  adminToken = generateToken({
    id: result.adminUser.id,
    username: result.adminUser.username,
    role: result.adminUser.role
  });

  viewerToken = generateToken({
    id: result.viewerUser.id,
    username: result.viewerUser.username,
    role: result.viewerUser.role
  });
});

afterAll(async () => {
  await teardownDatabase();
});

describe('Auth - Login', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.username).toBe('admin');
    expect(res.body.data.user.role).toBe('Admin');
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('should reject non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nouser', password: 'password' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should validate required fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth - Register', () => {
  it('should register a new user (admin only)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'password123',
        full_name: 'New User',
        role: 'Store Keeper'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('newuser');
    expect(res.body.data.role).toBe('Store Keeper');
  });

  it('should reject duplicate username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'admin',
        email: 'another@test.com',
        password: 'password123',
        role: 'Viewer'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration without admin role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        username: 'anotheruser',
        email: 'another2@test.com',
        password: 'password123',
        role: 'Viewer'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration without token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'anotheruser',
        email: 'another3@test.com',
        password: 'password123',
        role: 'Viewer'
      });

    expect(res.status).toBe(401);
  });
});

describe('Auth - Profile', () => {
  it('should get current user profile', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('admin');
    expect(res.body.data.email).toBe('admin@test.com');
  });

  it('should reject profile access without token', async () => {
    const res = await request(app)
      .get('/api/auth/profile');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject profile access with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalidtoken123');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth - Change Password', () => {
  it('should change password with valid current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        current_password: 'admin123',
        new_password: 'newpassword123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Password changed successfully');

    // Login with new password should work
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'newpassword123' });

    expect(loginRes.status).toBe(200);

    // Reset password back for other tests
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        current_password: 'newpassword123',
        new_password: 'admin123'
      });
  });

  it('should reject with incorrect current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        current_password: 'wrongpassword',
        new_password: 'newpassword123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should validate new password length', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        current_password: 'admin123',
        new_password: '123'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
