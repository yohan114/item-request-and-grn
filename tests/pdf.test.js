const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, LocalPurchase } = require('../src/models');
const { hashPassword, generateToken } = require('../src/services/authService');

let adminUser, viewerUser;
let adminToken, viewerToken;
let testPurchase;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const password = await hashPassword('password123');

  adminUser = await User.create({
    username: 'pdf_admin',
    email: 'pdf_admin@test.com',
    password,
    full_name: 'PDF Admin',
    role: 'Admin',
    is_active: true
  });

  viewerUser = await User.create({
    username: 'pdf_viewer',
    email: 'pdf_viewer@test.com',
    password,
    full_name: 'PDF Viewer',
    role: 'Viewer',
    is_active: true
  });

  adminToken = generateToken({ id: adminUser.id, username: adminUser.username, role: adminUser.role });
  viewerToken = generateToken({ id: viewerUser.id, username: viewerUser.username, role: viewerUser.role });

  testPurchase = await LocalPurchase.create({
    supplier_name: 'PDF Test Supplier',
    purchase_category: 'Electronics',
    item_name: 'Monitor',
    item_description: '27 inch 4K monitor',
    quantity: 3,
    unit_price: 450.00,
    total_amount: 1350.00,
    mrn_number: 'MRN-20240315-0001',
    grn_number: 'GRN-20240315-0001',
    invoice_number: 'INV-PDF-001',
    invoice_date: '2024-03-10',
    received_date: '2024-03-15',
    remarks: 'Test purchase for PDF generation',
    received_quantity: 3,
    checked_quantity: 3,
    accepted_quantity: 2,
    rejected_quantity: 1,
    grn_remarks: 'One unit was damaged during shipping',
    status: 'Completed',
    created_by: adminUser.id
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('PDF - MRN Sheet', () => {
  it('should generate MRN sheet PDF', async () => {
    const res = await request(app)
      .get(`/api/local-purchases/${testPurchase.id}/mrn-sheet`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('MRN_');
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should allow Viewer to generate MRN sheet', async () => {
    const res = await request(app)
      .get(`/api/local-purchases/${testPurchase.id}/mrn-sheet`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  it('should return 404 for non-existent record', async () => {
    const res = await request(app)
      .get('/api/local-purchases/00000000-0000-0000-0000-000000000000/mrn-sheet')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should require authentication', async () => {
    const res = await request(app)
      .get(`/api/local-purchases/${testPurchase.id}/mrn-sheet`);

    expect(res.status).toBe(401);
  });
});

describe('PDF - GRN Sheet', () => {
  it('should generate GRN sheet PDF', async () => {
    const res = await request(app)
      .get(`/api/local-purchases/${testPurchase.id}/grn-sheet`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('GRN_');
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should allow Viewer to generate GRN sheet', async () => {
    const res = await request(app)
      .get(`/api/local-purchases/${testPurchase.id}/grn-sheet`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  it('should return 404 for non-existent record', async () => {
    const res = await request(app)
      .get('/api/local-purchases/00000000-0000-0000-0000-000000000000/grn-sheet')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should require authentication', async () => {
    const res = await request(app)
      .get(`/api/local-purchases/${testPurchase.id}/grn-sheet`);

    expect(res.status).toBe(401);
  });
});
