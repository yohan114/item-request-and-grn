const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, MRN, GRN } = require('../src/models');
const { hashPassword, generateToken } = require('../src/services/authService');

let adminUser, managerUser, storeKeeperUser, viewerUser;
let adminToken, managerToken, storeKeeperToken, viewerToken;
let linkedMRNId;
let createdGRNId;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const password = await hashPassword('password123');

  adminUser = await User.create({
    username: 'grn_admin',
    email: 'grn_admin@test.com',
    password,
    full_name: 'GRN Admin',
    role: 'Admin',
    is_active: true
  });

  managerUser = await User.create({
    username: 'grn_manager',
    email: 'grn_manager@test.com',
    password,
    full_name: 'GRN Manager',
    role: 'Manager',
    is_active: true
  });

  storeKeeperUser = await User.create({
    username: 'grn_storekeeper',
    email: 'grn_storekeeper@test.com',
    password,
    full_name: 'GRN Store Keeper',
    role: 'Store Keeper',
    is_active: true
  });

  viewerUser = await User.create({
    username: 'grn_viewer',
    email: 'grn_viewer@test.com',
    password,
    full_name: 'GRN Viewer',
    role: 'Viewer',
    is_active: true
  });

  adminToken = generateToken({ id: adminUser.id, username: adminUser.username, role: adminUser.role });
  managerToken = generateToken({ id: managerUser.id, username: managerUser.username, role: managerUser.role });
  storeKeeperToken = generateToken({ id: storeKeeperUser.id, username: storeKeeperUser.username, role: storeKeeperUser.role });
  viewerToken = generateToken({ id: viewerUser.id, username: viewerUser.username, role: viewerUser.role });

  // Create an MRN to link GRNs to
  const mrnRes = await request(app)
    .post('/api/mrns')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      request_for: 'Electronics',
      items: [
        { item_no: '1', description: 'Business laptop', qty: 5 }
      ]
    });

  linkedMRNId = mrnRes.body.data.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('GRN - Create', () => {
  it('should allow Admin to create GRN', async () => {
    const res = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'GRN Supplier',
        item_name: 'Widget',
        received_quantity: 100,
        checked_quantity: 100,
        accepted_quantity: 95,
        rejected_quantity: 5
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.grn_number).toBeDefined();
    expect(res.body.data.supplier_name).toBe('GRN Supplier');
    createdGRNId = res.body.data.id;
  });

  it('should create GRN linked to existing MRN', async () => {
    const res = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Linked Supplier',
        item_name: 'Linked Item',
        mrn_id: linkedMRNId,
        received_quantity: 5
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mrn_id).toBe(linkedMRNId);
  });

  it('should reject creation by Viewer role', async () => {
    const res = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        supplier_name: 'Viewer Supplier',
        item_name: 'Viewer Item',
        received_quantity: 10
      });

    expect(res.status).toBe(403);
  });

  it('should return 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});

describe('GRN - List with Pagination', () => {
  beforeAll(async () => {
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/grns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplier_name: `GRN Supplier ${i}`,
          item_name: `GRN Item ${i}`,
          received_quantity: (i + 1) * 10,
          mrn_id: i < 3 ? linkedMRNId : undefined
        });
    }
  });

  it('should return paginated results', async () => {
    const res = await request(app)
      .get('/api/grns?page=1&limit=5')
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
      .get('/api/grns?status=Pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(record => {
      expect(record.status).toBe('Pending');
    });
  });

  it('should support mrn_id filter', async () => {
    const res = await request(app)
      .get(`/api/grns?mrn_id=${linkedMRNId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(record => {
      expect(record.mrn_id).toBe(linkedMRNId);
    });
  });
});

describe('GRN - Get by ID', () => {
  it('should return GRN with creator and linked MRN info', async () => {
    // Create a GRN linked to MRN for this test
    const createRes = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Detail Supplier',
        item_name: 'Detail Item',
        mrn_id: linkedMRNId,
        received_quantity: 10
      });

    const grnId = createRes.body.data.id;

    const res = await request(app)
      .get(`/api/grns/${grnId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(grnId);
    expect(res.body.data.grnCreator).toBeDefined();
    expect(res.body.data.mrn).toBeDefined();
  });

  it('should return 404 for non-existent ID', async () => {
    const res = await request(app)
      .get('/api/grns/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('GRN - Update', () => {
  it('should allow updating quantity fields', async () => {
    const res = await request(app)
      .put(`/api/grns/${createdGRNId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        received_quantity: 200,
        accepted_quantity: 190,
        rejected_quantity: 10
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject when accepted_quantity + rejected_quantity > received_quantity', async () => {
    const res = await request(app)
      .put(`/api/grns/${createdGRNId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        received_quantity: 100,
        accepted_quantity: 80,
        rejected_quantity: 30
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GRN - Delete', () => {
  it('should allow Admin to delete GRN', async () => {
    const createRes = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Delete Supplier',
        item_name: 'Delete Item',
        received_quantity: 10
      });

    const deleteId = createRes.body.data.id;

    const res = await request(app)
      .delete(`/api/grns/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app)
      .get(`/api/grns/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(404);
  });

  it('should reject delete by Store Keeper', async () => {
    const createRes = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        supplier_name: 'SK Delete Supplier',
        item_name: 'SK Delete Item',
        received_quantity: 5
      });

    const res = await request(app)
      .delete(`/api/grns/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GRN - PDF Sheet', () => {
  it('should return PDF for GRN sheet', async () => {
    const res = await request(app)
      .get(`/api/grns/${createdGRNId}/grn-sheet`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });
});

describe('GRN - Summary Stats', () => {
  it('should return GRN summary stats', async () => {
    const res = await request(app)
      .get('/api/reports/grn-summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBeDefined();
    expect(res.body.data.by_status).toBeDefined();
    expect(typeof res.body.data.total).toBe('number');
    expect(res.body.data.total).toBeGreaterThan(0);
  });
});
