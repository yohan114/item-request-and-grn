const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, LocalPurchase } = require('../src/models');
const { hashPassword, generateToken } = require('../src/services/authService');

let adminUser, managerUser, viewerUser;
let adminToken, managerToken, viewerToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const password = await hashPassword('password123');

  adminUser = await User.create({
    username: 'report_admin',
    email: 'report_admin@test.com',
    password,
    full_name: 'Report Admin',
    role: 'Admin',
    is_active: true
  });

  managerUser = await User.create({
    username: 'report_manager',
    email: 'report_manager@test.com',
    password,
    full_name: 'Report Manager',
    role: 'Manager',
    is_active: true
  });

  viewerUser = await User.create({
    username: 'report_viewer',
    email: 'report_viewer@test.com',
    password,
    full_name: 'Report Viewer',
    role: 'Viewer',
    is_active: true
  });

  adminToken = generateToken({ id: adminUser.id, username: adminUser.username, role: adminUser.role });
  managerToken = generateToken({ id: managerUser.id, username: managerUser.username, role: managerUser.role });
  viewerToken = generateToken({ id: viewerUser.id, username: viewerUser.username, role: viewerUser.role });

  // Create test purchase records
  await LocalPurchase.create({
    supplier_name: 'Supplier A',
    purchase_category: 'Office Supplies',
    item_name: 'Paper',
    quantity: 100,
    unit_price: 5.00,
    total_amount: 500.00,
    mrn_number: 'MRN-20240101-0001',
    grn_number: 'GRN-20240101-0001',
    status: 'Pending',
    created_by: adminUser.id
  });

  await LocalPurchase.create({
    supplier_name: 'Supplier B',
    purchase_category: 'IT Equipment',
    item_name: 'Keyboard',
    quantity: 10,
    unit_price: 50.00,
    total_amount: 500.00,
    mrn_number: 'MRN-20240101-0002',
    grn_number: 'GRN-20240101-0002',
    status: 'Approved',
    created_by: adminUser.id
  });

  await LocalPurchase.create({
    supplier_name: 'Supplier C',
    purchase_category: 'Office Supplies',
    item_name: 'Pens',
    quantity: 50,
    unit_price: 2.00,
    total_amount: 100.00,
    mrn_number: 'MRN-20240101-0003',
    grn_number: 'GRN-20240101-0003',
    status: 'Completed',
    created_by: managerUser.id
  });

  await LocalPurchase.create({
    supplier_name: 'Supplier D',
    purchase_category: 'Maintenance',
    item_name: 'Light Bulbs',
    quantity: 20,
    unit_price: 10.00,
    total_amount: 200.00,
    mrn_number: 'MRN-20240101-0004',
    grn_number: 'GRN-20240101-0004',
    status: 'Rejected',
    created_by: adminUser.id
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Reports API', () => {
  describe('GET /api/reports/summary', () => {
    it('should return summary stats for Admin', async () => {
      const res = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_records).toBe(4);
      expect(res.body.data.by_status.Pending).toBe(1);
      expect(res.body.data.by_status.Approved).toBe(1);
      expect(res.body.data.by_status.Completed).toBe(1);
      expect(res.body.data.by_status.Rejected).toBe(1);
      expect(res.body.data.by_category['Office Supplies']).toBe(2);
      expect(res.body.data.by_category['IT Equipment']).toBe(1);
      expect(res.body.data.by_category['Maintenance']).toBe(1);
      expect(res.body.data.total_amount).toBe(1300);
    });

    it('should return summary stats for Manager', async () => {
      const res = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_records).toBe(4);
    });

    it('should deny access for Viewer', async () => {
      const res = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    it('should filter summary by status', async () => {
      const res = await request(app)
        .get('/api/reports/summary?status=Pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total_records).toBe(1);
      expect(res.body.data.total_amount).toBe(500);
    });

    it('should filter summary by category', async () => {
      const res = await request(app)
        .get('/api/reports/summary?purchase_category=Office Supplies')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total_records).toBe(2);
      expect(res.body.data.total_amount).toBe(600);
    });
  });

  describe('GET /api/reports/local-purchases (CSV)', () => {
    it('should export CSV report for Admin', async () => {
      const res = await request(app)
        .get('/api/reports/local-purchases?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('local-purchases-report.csv');
      expect(res.text).toContain('MRN Number');
      expect(res.text).toContain('Supplier A');
      expect(res.text).toContain('Supplier B');
    });

    it('should export filtered CSV report', async () => {
      const res = await request(app)
        .get('/api/reports/local-purchases?format=csv&status=Pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Supplier A');
      expect(res.text).not.toContain('Supplier B');
    });

    it('should deny CSV export for Viewer', async () => {
      const res = await request(app)
        .get('/api/reports/local-purchases?format=csv')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/reports/local-purchases (PDF)', () => {
    it('should export PDF report for Admin', async () => {
      const res = await request(app)
        .get('/api/reports/local-purchases?format=pdf')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('local-purchases-report.pdf');
      // PDF starts with %PDF header
      expect(res.body.slice(0, 4).toString()).toBe('%PDF');
    });

    it('should export PDF report for Manager', async () => {
      const res = await request(app)
        .get('/api/reports/local-purchases?format=pdf')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });
});
