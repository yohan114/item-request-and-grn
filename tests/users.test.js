const request = require('supertest');
const app = require('../src/app');
const { setupDatabase, teardownDatabase } = require('./setup');
const { generateToken } = require('../src/services/authService');

let adminUser;
let viewerUser;
let adminToken;
let viewerToken;

beforeAll(async () => {
  const result = await setupDatabase();
  adminUser = result.adminUser;
  viewerUser = result.viewerUser;

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

describe('Users - List', () => {
  it('should list all users (admin only)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    // Ensure password is not exposed
    res.body.data.forEach(user => {
      expect(user.password).toBeUndefined();
    });
  });

  it('should reject non-admin access to list users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should reject unauthenticated access', async () => {
    const res = await request(app)
      .get('/api/users');

    expect(res.status).toBe(401);
  });
});

describe('Users - Get by ID', () => {
  it('should get a user by ID (admin only)', async () => {
    const res = await request(app)
      .get(`/api/users/${viewerUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('viewer');
    expect(res.body.data.password).toBeUndefined();
  });

  it('should return 404 for non-existent user', async () => {
    const res = await request(app)
      .get('/api/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Users - Update', () => {
  it('should update a user (admin only)', async () => {
    const res = await request(app)
      .put(`/api/users/${viewerUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name: 'Updated Viewer Name',
        role: 'Manager'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.full_name).toBe('Updated Viewer Name');
    expect(res.body.data.role).toBe('Manager');
  });

  it('should reject non-admin update', async () => {
    const res = await request(app)
      .put(`/api/users/${viewerUser.id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ full_name: 'Hacked' });

    expect(res.status).toBe(403);
  });
});

describe('Users - Delete (Soft Delete)', () => {
  it('should soft delete (deactivate) a user', async () => {
    // First create a user to delete
    const createRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'todelete',
        email: 'todelete@test.com',
        password: 'password123',
        role: 'Viewer'
      });

    const userId = createRes.body.data.id;

    const res = await request(app)
      .delete(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('User deactivated successfully');

    // Verify user is deactivated
    const getRes = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.body.data.is_active).toBe(false);
  });

  it('should not allow deleting own account', async () => {
    const res = await request(app)
      .delete(`/api/users/${adminUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot delete your own account');
  });

  it('should reject non-admin delete', async () => {
    const res = await request(app)
      .delete(`/api/users/${adminUser.id}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
  });
});
