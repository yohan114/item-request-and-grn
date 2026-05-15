const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, MRN } = require('../src/models');
const { hashPassword, generateToken } = require('../src/services/authService');

let adminUser, managerUser, storeKeeperUser, viewerUser;
let adminToken, managerToken, storeKeeperToken, viewerToken;
let createdMRNId;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const password = await hashPassword('password123');

  adminUser = await User.create({
    username: 'mrn_admin',
    email: 'mrn_admin@test.com',
    password,
    full_name: 'MRN Admin',
    role: 'Admin',
    is_active: true
  });

  managerUser = await User.create({
    username: 'mrn_manager',
    email: 'mrn_manager@test.com',
    password,
    full_name: 'MRN Manager',
    role: 'Manager',
    is_active: true
  });

  storeKeeperUser = await User.create({
    username: 'mrn_storekeeper',
    email: 'mrn_storekeeper@test.com',
    password,
    full_name: 'MRN Store Keeper',
    role: 'Store Keeper',
    is_active: true
  });

  viewerUser = await User.create({
    username: 'mrn_viewer',
    email: 'mrn_viewer@test.com',
    password,
    full_name: 'MRN Viewer',
    role: 'Viewer',
    is_active: true
  });

  adminToken = generateToken({ id: adminUser.id, username: adminUser.username, role: adminUser.role });
  managerToken = generateToken({ id: managerUser.id, username: managerUser.username, role: managerUser.role });
  storeKeeperToken = generateToken({ id: storeKeeperUser.id, username: storeKeeperUser.username, role: storeKeeperUser.role });
  viewerToken = generateToken({ id: viewerUser.id, username: viewerUser.username, role: viewerUser.role });
});

afterAll(async () => {
  await sequelize.close();
});

describe('MRN - Create', () => {
  it('should allow Admin to create MRN with auto-generated mrn_number', async () => {
    const res = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        request_for: 'Vehicle',
        items: [
          { item_no: '1', description: 'Printer Paper', qty: 10 }
        ],
        request_person_name: 'John Doe',
        request_person_designation: 'Manager'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mrn_number).toBeDefined();
    expect(res.body.data.request_for).toBe('Vehicle');
    createdMRNId = res.body.data.id;
  });

  it('should allow Store Keeper to create MRN', async () => {
    const res = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Office Equipment',
        items: [
          { item_no: '1', description: 'Hammer', qty: 2 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject creation by Viewer role', async () => {
    const res = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        request_for: 'Vehicle',
        items: [
          { item_no: '1', description: 'Item X', qty: 1 }
        ]
      });

    expect(res.status).toBe(403);
  });

  it('should return 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});

describe('MRN - List with Pagination', () => {
  beforeAll(async () => {
    for (let i = 0; i < 12; i++) {
      await request(app)
        .post('/api/mrns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          request_for: `Request ${i}`,
          items: [
            { item_no: '1', description: `Item ${i}`, qty: i + 1 }
          ]
        });
    }
  });

  it('should return paginated results', async () => {
    const res = await request(app)
      .get('/api/mrns?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(5);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThan(5);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
    expect(res.body.pagination.total_pages).toBeGreaterThan(1);
  });

  it('should support status filter', async () => {
    const res = await request(app)
      .get('/api/mrns?status=Draft')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(record => {
      expect(record.status).toBe('Draft');
    });
  });

  it('should support request_for filter', async () => {
    const res = await request(app)
      .get('/api/mrns?request_for=Request 1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('MRN - Get by ID', () => {
  it('should return MRN with creator info', async () => {
    const res = await request(app)
      .get(`/api/mrns/${createdMRNId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdMRNId);
    expect(res.body.data.creator).toBeDefined();
  });

  it('should return 404 for non-existent ID', async () => {
    const res = await request(app)
      .get('/api/mrns/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('MRN - Update', () => {
  it('should allow Admin to update MRN', async () => {
    const res = await request(app)
      .put(`/api/mrns/${createdMRNId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        request_for: 'Updated Vehicle',
        items: [
          { item_no: '1', description: 'Updated Item', qty: 20 }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request_for).toBe('Updated Vehicle');
  });

  it('should return 404 for non-existent ID', async () => {
    const res = await request(app)
      .put('/api/mrns/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ request_for: 'Test' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('MRN - Delete', () => {
  it('should allow Admin to delete MRN', async () => {
    const createRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        request_for: 'Delete Test',
        items: [
          { item_no: '1', description: 'Delete Item', qty: 1 }
        ]
      });

    const deleteId = createRes.body.data.id;

    const res = await request(app)
      .delete(`/api/mrns/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app)
      .get(`/api/mrns/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(404);
  });

  it('should reject delete by Store Keeper', async () => {
    const createRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'SK Delete Test',
        items: [
          { item_no: '1', description: 'SK Delete Item', qty: 1 }
        ]
      });

    const res = await request(app)
      .delete(`/api/mrns/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    expect(res.status).toBe(403);
  });
});

describe('MRN - PDF Sheet', () => {
  it('should return PDF for MRN sheet', async () => {
    const res = await request(app)
      .get(`/api/mrns/${createdMRNId}/mrn-sheet`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });
});

describe('MRN - Summary Stats', () => {
  it('should return MRN summary stats', async () => {
    const res = await request(app)
      .get('/api/reports/mrn-summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBeDefined();
    expect(res.body.data.by_status).toBeDefined();
    expect(typeof res.body.data.total).toBe('number');
    expect(res.body.data.total).toBeGreaterThan(0);
  });
});
