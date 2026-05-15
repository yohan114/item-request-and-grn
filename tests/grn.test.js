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
        project_name: 'Project Alpha',
        items: [
          { item_no: '1', description: 'Widget A', qty: 100, price: 25.50 },
          { item_no: '2', description: 'Widget B', qty: 50, price: 10 }
        ],
        request_person_name: 'John Doe',
        request_person_designation: 'Engineer',
        approval_person_name: 'Jane Smith',
        approval_person_designation: 'Manager'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.grn_number).toBeDefined();
    expect(res.body.data.supplier_name).toBe('GRN Supplier');
    expect(res.body.data.project_name).toBe('Project Alpha');
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items[0].item_no).toBe('1');
    expect(res.body.data.items[0].price).toBe(25.50);
    expect(res.body.data.request_person_name).toBe('John Doe');
    expect(res.body.data.approval_person_name).toBe('Jane Smith');
    createdGRNId = res.body.data.id;
  });

  it('should create GRN with minimal fields', async () => {
    const res = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Minimal Supplier',
        items: [
          { item_no: '1', description: 'Basic item', qty: 1, price: 0 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.supplier_name).toBe('Minimal Supplier');
    expect(res.body.data.items).toHaveLength(1);
  });

  it('should reject creation by Viewer role', async () => {
    const res = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        supplier_name: 'Viewer Supplier',
        items: [
          { item_no: '1', description: 'Item', qty: 10, price: 5 }
        ]
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

  it('should return 400 for empty items array', async () => {
    const res = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Test Supplier',
        items: []
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for items with invalid qty', async () => {
    const res = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Test Supplier',
        items: [
          { item_no: '1', description: 'Item', qty: -1, price: 5 }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
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
          project_name: `Project ${i}`,
          items: [
            { item_no: '1', description: `Item ${i}`, qty: (i + 1) * 10, price: i * 5 }
          ]
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
});

describe('GRN - Get by ID', () => {
  it('should return GRN with creator info', async () => {
    const res = await request(app)
      .get(`/api/grns/${createdGRNId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdGRNId);
    expect(res.body.data.grnCreator).toBeDefined();
    expect(res.body.data.items).toBeDefined();
    expect(res.body.data.items.length).toBeGreaterThan(0);
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
  it('should allow updating fields', async () => {
    const res = await request(app)
      .put(`/api/grns/${createdGRNId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Updated Supplier',
        project_name: 'Updated Project',
        items: [
          { item_no: '1', description: 'Updated Widget', qty: 200, price: 30 }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.supplier_name).toBe('Updated Supplier');
    expect(res.body.data.project_name).toBe('Updated Project');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].description).toBe('Updated Widget');
  });

  it('should allow updating signature fields', async () => {
    const res = await request(app)
      .put(`/api/grns/${createdGRNId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        request_person_name: 'New Request Person',
        approval_person_designation: 'Director'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request_person_name).toBe('New Request Person');
    expect(res.body.data.approval_person_designation).toBe('Director');
  });
});

describe('GRN - Delete', () => {
  it('should allow Admin to delete GRN', async () => {
    const createRes = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Delete Supplier',
        items: [
          { item_no: '1', description: 'Delete Item', qty: 10, price: 5 }
        ]
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
        items: [
          { item_no: '1', description: 'SK Item', qty: 5, price: 2 }
        ]
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
