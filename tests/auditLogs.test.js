const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, AuditLog } = require('../src/models');
const { hashPassword, generateToken } = require('../src/services/authService');

let adminUser, managerUser, viewerUser;
let adminToken, managerToken, viewerToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const password = await hashPassword('password123');

  adminUser = await User.create({
    username: 'audit_admin',
    email: 'audit_admin@test.com',
    password,
    full_name: 'Audit Admin',
    role: 'Admin',
    is_active: true
  });

  managerUser = await User.create({
    username: 'audit_manager',
    email: 'audit_manager@test.com',
    password,
    full_name: 'Audit Manager',
    role: 'Manager',
    is_active: true
  });

  viewerUser = await User.create({
    username: 'audit_viewer',
    email: 'audit_viewer@test.com',
    password,
    full_name: 'Audit Viewer',
    role: 'Viewer',
    is_active: true
  });

  adminToken = generateToken({ id: adminUser.id, username: adminUser.username, role: adminUser.role });
  managerToken = generateToken({ id: managerUser.id, username: managerUser.username, role: managerUser.role });
  viewerToken = generateToken({ id: viewerUser.id, username: viewerUser.username, role: viewerUser.role });

  // Create some audit log entries
  await AuditLog.create({
    user_id: adminUser.id,
    action: 'CREATE',
    entity_type: 'LocalPurchase',
    entity_id: '11111111-1111-1111-1111-111111111111',
    new_values: { item_name: 'Test Item' }
  });

  await AuditLog.create({
    user_id: adminUser.id,
    action: 'UPDATE',
    entity_type: 'LocalPurchase',
    entity_id: '11111111-1111-1111-1111-111111111111',
    old_values: { status: 'Pending' },
    new_values: { status: 'Approved' }
  });

  await AuditLog.create({
    user_id: managerUser.id,
    action: 'CREATE',
    entity_type: 'Attachment',
    entity_id: '22222222-2222-2222-2222-222222222222',
    new_values: { filename: 'invoice.pdf' }
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Audit Logs API', () => {
  describe('GET /api/audit-logs', () => {
    it('should list audit logs for Admin', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(3);
    });

    it('should list audit logs for Manager', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deny access for Viewer', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should filter by entity_type', async () => {
      const res = await request(app)
        .get('/api/audit-logs?entity_type=Attachment')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].entity_type).toBe('Attachment');
    });

    it('should filter by action', async () => {
      const res = await request(app)
        .get('/api/audit-logs?action=CREATE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should filter by user_id', async () => {
      const res = await request(app)
        .get(`/api/audit-logs?user_id=${managerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].entity_type).toBe('Attachment');
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/audit-logs?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.total_pages).toBe(2);
    });

    it('should filter by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .get(`/api/audit-logs?date_from=${today}&date_to=${today}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });
  });

  describe('GET /api/audit-logs/:entity_type/:entity_id', () => {
    it('should get logs for a specific entity', async () => {
      const res = await request(app)
        .get('/api/audit-logs/LocalPurchase/11111111-1111-1111-1111-111111111111')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should return empty array for non-existent entity', async () => {
      const res = await request(app)
        .get('/api/audit-logs/LocalPurchase/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('should deny access for Viewer', async () => {
      const res = await request(app)
        .get('/api/audit-logs/LocalPurchase/11111111-1111-1111-1111-111111111111')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
