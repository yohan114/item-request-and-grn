const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, LocalPurchase } = require('../src/models');
const { hashPassword, generateToken } = require('../src/services/authService');

let adminUser, managerUser, storeKeeperUser, viewerUser;
let adminToken, managerToken, storeKeeperToken, viewerToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const password = await hashPassword('password123');

  adminUser = await User.create({
    username: 'lp_admin',
    email: 'lp_admin@test.com',
    password,
    full_name: 'LP Admin',
    role: 'Admin',
    is_active: true
  });

  managerUser = await User.create({
    username: 'lp_manager',
    email: 'lp_manager@test.com',
    password,
    full_name: 'LP Manager',
    role: 'Manager',
    is_active: true
  });

  storeKeeperUser = await User.create({
    username: 'lp_storekeeper',
    email: 'lp_storekeeper@test.com',
    password,
    full_name: 'LP Store Keeper',
    role: 'Store Keeper',
    is_active: true
  });

  viewerUser = await User.create({
    username: 'lp_viewer',
    email: 'lp_viewer@test.com',
    password,
    full_name: 'LP Viewer',
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

describe('Local Purchases - Create', () => {
  it('should create a local purchase record with auto-generated MRN and GRN', async () => {
    const res = await request(app)
      .post('/api/local-purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Test Supplier',
        purchase_category: 'Office Supplies',
        item_name: 'Printer Paper',
        item_description: 'A4 paper ream',
        quantity: 10,
        unit_price: 25.50,
        invoice_number: 'INV-001',
        invoice_date: '2024-01-15',
        received_date: '2024-01-16',
        remarks: 'Urgent order'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mrn_number).toMatch(/^MRN-\d{8}-\d{4}$/);
    expect(res.body.data.grn_number).toMatch(/^GRN-\d{8}-\d{4}$/);
    expect(res.body.data.supplier_name).toBe('Test Supplier');
    expect(res.body.data.item_name).toBe('Printer Paper');
  });

  it('should auto-calculate total_amount from quantity * unit_price', async () => {
    const res = await request(app)
      .post('/api/local-purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Supplier B',
        purchase_category: 'Electronics',
        item_name: 'USB Cable',
        quantity: 5,
        unit_price: 12.00
      });

    expect(res.status).toBe(201);
    expect(parseFloat(res.body.data.total_amount)).toBe(60.00);
  });

  it('should allow Store Keeper to create records', async () => {
    const res = await request(app)
      .post('/api/local-purchases')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        supplier_name: 'SK Supplier',
        purchase_category: 'Tools',
        item_name: 'Hammer',
        quantity: 2,
        unit_price: 35.00
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject creation by Viewer role', async () => {
    const res = await request(app)
      .post('/api/local-purchases')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        supplier_name: 'Viewer Supplier',
        purchase_category: 'Misc',
        item_name: 'Item X',
        quantity: 1,
        unit_price: 10.00
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should validate required fields', async () => {
    const res = await request(app)
      .post('/api/local-purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('should reject negative quantity', async () => {
    const res = await request(app)
      .post('/api/local-purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Supplier',
        purchase_category: 'Category',
        item_name: 'Item',
        quantity: -5,
        unit_price: 10.00
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Local Purchases - List with Pagination', () => {
  beforeAll(async () => {
    // Create multiple records for pagination testing
    for (let i = 0; i < 15; i++) {
      await LocalPurchase.create({
        supplier_name: `Supplier ${i}`,
        purchase_category: i % 2 === 0 ? 'Electronics' : 'Stationery',
        item_name: `Item ${i}`,
        quantity: i + 1,
        unit_price: 10.00,
        total_amount: (i + 1) * 10.00,
        mrn_number: `MRN-20240101-${String(100 + i).padStart(4, '0')}`,
        grn_number: `GRN-20240101-${String(100 + i).padStart(4, '0')}`,
        status: i < 5 ? 'MRN Created' : i < 10 ? 'Approved' : 'Completed',
        created_by: adminUser.id
      });
    }
  });

  it('should return paginated results', async () => {
    const res = await request(app)
      .get('/api/local-purchases?page=1&limit=5')
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

  it('should return second page', async () => {
    const res = await request(app)
      .get('/api/local-purchases?page=2&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(5);
    expect(res.body.pagination.page).toBe(2);
  });

  it('should allow Viewer to list records', async () => {
    const res = await request(app)
      .get('/api/local-purchases?page=1&limit=5')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Local Purchases - Search', () => {
  it('should search by supplier name', async () => {
    const res = await request(app)
      .get('/api/local-purchases?supplier_name=Supplier 1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(record => {
      expect(record.supplier_name).toContain('Supplier 1');
    });
  });

  it('should search by MRN number', async () => {
    const res = await request(app)
      .get('/api/local-purchases?mrn_number=MRN-20240101-0100')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should search by GRN number', async () => {
    const res = await request(app)
      .get('/api/local-purchases?grn_number=GRN-20240101-0100')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should search by invoice number', async () => {
    const res = await request(app)
      .get('/api/local-purchases?invoice_number=INV-001')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('Local Purchases - Filter', () => {
  it('should filter by status', async () => {
    const res = await request(app)
      .get('/api/local-purchases?status=Approved')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(record => {
      expect(record.status).toBe('Approved');
    });
  });

  it('should filter by purchase category', async () => {
    const res = await request(app)
      .get('/api/local-purchases?purchase_category=Electronics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(record => {
      expect(record.purchase_category).toBe('Electronics');
    });
  });

  it('should filter by created_by', async () => {
    const res = await request(app)
      .get(`/api/local-purchases?created_by=${adminUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(record => {
      expect(record.created_by).toBe(adminUser.id);
    });
  });

  it('should filter by date range', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .get(`/api/local-purchases?date_from=${today}&date_to=${today}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('Local Purchases - Get by ID', () => {
  let purchaseId;

  beforeAll(async () => {
    const purchase = await LocalPurchase.findOne();
    purchaseId = purchase.id;
  });

  it('should get a single record with associations', async () => {
    const res = await request(app)
      .get(`/api/local-purchases/${purchaseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(purchaseId);
    expect(res.body.data.creator).toBeDefined();
    expect(res.body.data.attachments).toBeDefined();
    expect(res.body.data.approvalHistory).toBeDefined();
  });

  it('should return 404 for non-existent record', async () => {
    const res = await request(app)
      .get('/api/local-purchases/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should allow Viewer to get record by ID', async () => {
    const res = await request(app)
      .get(`/api/local-purchases/${purchaseId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Local Purchases - Update', () => {
  let adminPurchaseId;
  let skPurchaseId;

  beforeAll(async () => {
    const adminPurchase = await LocalPurchase.create({
      supplier_name: 'Update Test Supplier',
      purchase_category: 'Test Category',
      item_name: 'Update Item',
      quantity: 3,
      unit_price: 20.00,
      total_amount: 60.00,
      mrn_number: 'MRN-20240201-9001',
      grn_number: 'GRN-20240201-9001',
      created_by: adminUser.id
    });
    adminPurchaseId = adminPurchase.id;

    const skPurchase = await LocalPurchase.create({
      supplier_name: 'SK Update Supplier',
      purchase_category: 'SK Category',
      item_name: 'SK Item',
      quantity: 5,
      unit_price: 15.00,
      total_amount: 75.00,
      mrn_number: 'MRN-20240201-9002',
      grn_number: 'GRN-20240201-9002',
      created_by: storeKeeperUser.id
    });
    skPurchaseId = skPurchase.id;
  });

  it('should update a record', async () => {
    const res = await request(app)
      .put(`/api/local-purchases/${adminPurchaseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Updated Supplier',
        quantity: 10,
        unit_price: 30.00
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.supplier_name).toBe('Updated Supplier');
    expect(parseFloat(res.body.data.total_amount)).toBe(300.00);
  });

  it('should allow Manager to update any record', async () => {
    const res = await request(app)
      .put(`/api/local-purchases/${adminPurchaseId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        remarks: 'Manager updated this'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should allow Store Keeper to update their own record', async () => {
    const res = await request(app)
      .put(`/api/local-purchases/${skPurchaseId}`)
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        supplier_name: 'SK Updated Supplier'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should prevent Store Keeper from updating others records', async () => {
    const res = await request(app)
      .put(`/api/local-purchases/${adminPurchaseId}`)
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        supplier_name: 'Hacked Supplier'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should reject update by Viewer', async () => {
    const res = await request(app)
      .put(`/api/local-purchases/${adminPurchaseId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        supplier_name: 'Viewer Update'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 for non-existent record', async () => {
    const res = await request(app)
      .put('/api/local-purchases/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ supplier_name: 'Test' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Local Purchases - Delete', () => {
  let deletePurchaseId;

  beforeAll(async () => {
    const purchase = await LocalPurchase.create({
      supplier_name: 'Delete Test Supplier',
      purchase_category: 'Delete Category',
      item_name: 'Delete Item',
      quantity: 1,
      unit_price: 100.00,
      total_amount: 100.00,
      mrn_number: 'MRN-20240201-9999',
      grn_number: 'GRN-20240201-9999',
      created_by: adminUser.id
    });
    deletePurchaseId = purchase.id;
  });

  it('should allow Admin to delete a record', async () => {
    const res = await request(app)
      .delete(`/api/local-purchases/${deletePurchaseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Local purchase record deleted successfully');

    // Verify it's deleted
    const getRes = await request(app)
      .get(`/api/local-purchases/${deletePurchaseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(404);
  });

  it('should reject delete by Store Keeper', async () => {
    const purchase = await LocalPurchase.create({
      supplier_name: 'SK Delete Test',
      purchase_category: 'Category',
      item_name: 'Item',
      quantity: 1,
      unit_price: 10.00,
      total_amount: 10.00,
      mrn_number: 'MRN-20240201-9998',
      grn_number: 'GRN-20240201-9998',
      created_by: storeKeeperUser.id
    });

    const res = await request(app)
      .delete(`/api/local-purchases/${purchase.id}`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should reject delete by Manager', async () => {
    const purchase = await LocalPurchase.create({
      supplier_name: 'Manager Delete Test',
      purchase_category: 'Category',
      item_name: 'Item',
      quantity: 1,
      unit_price: 10.00,
      total_amount: 10.00,
      mrn_number: 'MRN-20240201-9997',
      grn_number: 'GRN-20240201-9997',
      created_by: managerUser.id
    });

    const res = await request(app)
      .delete(`/api/local-purchases/${purchase.id}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should reject delete by Viewer', async () => {
    const purchase = await LocalPurchase.findOne();

    const res = await request(app)
      .delete(`/api/local-purchases/${purchase.id}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 for non-existent record', async () => {
    const res = await request(app)
      .delete('/api/local-purchases/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Local Purchases - Audit Logging', () => {
  it('should create audit log on record creation', async () => {
    const { AuditLog } = require('../src/models');

    const res = await request(app)
      .post('/api/local-purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Audit Test Supplier',
        purchase_category: 'Audit Category',
        item_name: 'Audit Item',
        quantity: 1,
        unit_price: 50.00
      });

    expect(res.status).toBe(201);

    const logs = await AuditLog.findAll({
      where: {
        entity_type: 'LocalPurchase',
        entity_id: res.body.data.id,
        action: 'CREATE'
      }
    });

    expect(logs.length).toBe(1);
    expect(logs[0].user_id).toBe(adminUser.id);
  });
});
