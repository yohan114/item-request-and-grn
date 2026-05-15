const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, LocalPurchase, Attachment } = require('../src/models');
const { hashPassword, generateToken } = require('../src/services/authService');

let adminUser, managerUser, storeKeeperUser, viewerUser;
let adminToken, managerToken, storeKeeperToken, viewerToken;
let testPurchase;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const password = await hashPassword('password123');

  adminUser = await User.create({
    username: 'appr_admin',
    email: 'appr_admin@test.com',
    password,
    full_name: 'Approval Admin',
    role: 'Admin',
    is_active: true
  });

  managerUser = await User.create({
    username: 'appr_manager',
    email: 'appr_manager@test.com',
    password,
    full_name: 'Approval Manager',
    role: 'Manager',
    is_active: true
  });

  storeKeeperUser = await User.create({
    username: 'appr_storekeeper',
    email: 'appr_storekeeper@test.com',
    password,
    full_name: 'Approval Store Keeper',
    role: 'Store Keeper',
    is_active: true
  });

  viewerUser = await User.create({
    username: 'appr_viewer',
    email: 'appr_viewer@test.com',
    password,
    full_name: 'Approval Viewer',
    role: 'Viewer',
    is_active: true
  });

  adminToken = generateToken({ id: adminUser.id, username: adminUser.username, role: adminUser.role });
  managerToken = generateToken({ id: managerUser.id, username: managerUser.username, role: managerUser.role });
  storeKeeperToken = generateToken({ id: storeKeeperUser.id, username: storeKeeperUser.username, role: storeKeeperUser.role });
  viewerToken = generateToken({ id: viewerUser.id, username: viewerUser.username, role: viewerUser.role });
});

beforeEach(async () => {
  await LocalPurchase.destroy({ where: {} });
  await Attachment.destroy({ where: {} });

  testPurchase = await LocalPurchase.create({
    supplier_name: 'Test Supplier',
    purchase_category: 'Office Supplies',
    item_name: 'Printer Paper',
    quantity: 10,
    unit_price: 25.00,
    total_amount: 250.00,
    mrn_number: 'MRN-20240101-0001',
    grn_number: 'GRN-20240101-0001',
    status: 'Pending Approval',
    created_by: storeKeeperUser.id
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Approval Workflow', () => {
  describe('POST /api/local-purchases/:id/approve', () => {
    it('should approve a Pending Approval record (Manager)', async () => {
      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ remarks: 'Looks good' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Approved');
    });

    it('should approve a Pending Approval record (Admin)', async () => {
      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Approved');
    });

    it('should reject approval by Store Keeper (role restriction)', async () => {
      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/approve`)
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject approval by Viewer (role restriction)', async () => {
      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/approve`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should not approve an already approved record', async () => {
      await testPurchase.update({ status: 'Approved' });

      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot transition');
    });

    it('should return 404 for non-existent record', async () => {
      const res = await request(app)
        .post('/api/local-purchases/00000000-0000-0000-0000-000000000000/approve')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/local-purchases/:id/reject', () => {
    it('should reject a Pending Approval record with remarks', async () => {
      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ remarks: 'Budget exceeded' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Rejected');
    });

    it('should require remarks when rejecting', async () => {
      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Remarks are required');
    });

    it('should require non-empty remarks when rejecting', async () => {
      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ remarks: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Remarks are required');
    });

    it('should not reject an already rejected record', async () => {
      await testPurchase.update({ status: 'Rejected' });

      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ remarks: 'Trying again' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot transition');
    });
  });

  describe('POST /api/local-purchases/:id/complete', () => {
    it('should complete an approved record with required conditions', async () => {
      await testPurchase.update({ status: 'Approved', grn_completed: true, invoice_attached: true });

      // Create MRN attachment required for completion
      await Attachment.create({
        local_purchase_id: testPurchase.id,
        file_name: 'mrn.pdf',
        original_name: 'mrn.pdf',
        file_path: '/tmp/mrn.pdf',
        file_type: 'application/pdf',
        file_size: 1000,
        attachment_type: 'Manual MRN Photo',
        uploaded_by: storeKeeperUser.id
      });

      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/complete`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ remarks: 'All items received' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Completed');
    });

    it('should not complete a MRN Created record (invalid transition)', async () => {
      await testPurchase.update({ status: 'MRN Created' });

      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/complete`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot transition');
    });

    it('should not complete a rejected record (invalid transition)', async () => {
      await testPurchase.update({ status: 'Rejected' });

      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/complete`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot transition');
    });

    it('should not complete without grn_completed and invoice_attached', async () => {
      await testPurchase.update({ status: 'Approved', grn_completed: false, invoice_attached: false });

      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/complete`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('GRN must be completed');
    });
  });

  describe('POST /api/local-purchases/:id/advance-status', () => {
    it('should advance status from MRN Created to MRN Uploaded with MRN attachment', async () => {
      await testPurchase.update({ status: 'MRN Created' });

      // Create the required MRN attachment
      await Attachment.create({
        local_purchase_id: testPurchase.id,
        file_name: 'mrn.jpg',
        original_name: 'mrn.jpg',
        file_path: '/tmp/mrn.jpg',
        file_type: 'image/jpeg',
        file_size: 500,
        attachment_type: 'Manual MRN Photo',
        uploaded_by: storeKeeperUser.id
      });

      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/advance-status`)
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .send({ status: 'MRN Uploaded' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('MRN Uploaded');
    });

    it('should not advance to MRN Uploaded without MRN attachment', async () => {
      await testPurchase.update({ status: 'MRN Created' });

      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/advance-status`)
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .send({ status: 'MRN Uploaded' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Manual MRN Photo or Manual MRN Scanned Copy attachment is required');
    });

    it('should advance from MRN Uploaded to Item Purchased', async () => {
      await testPurchase.update({ status: 'MRN Uploaded' });

      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/advance-status`)
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .send({ status: 'Item Purchased' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Item Purchased');
    });

    it('should require target status', async () => {
      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/advance-status`)
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Target status is required');
    });

    it('should reject invalid transitions', async () => {
      await testPurchase.update({ status: 'MRN Created' });

      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/advance-status`)
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .send({ status: 'Completed' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot transition');
    });

    it('should reject advancement by Viewer', async () => {
      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/advance-status`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ status: 'MRN Uploaded' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should not advance to GRN Completed without invoice_attached', async () => {
      await testPurchase.update({ status: 'Invoice Attached', invoice_attached: false });

      const res = await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/advance-status`)
        .set('Authorization', `Bearer ${storeKeeperToken}`)
        .send({ status: 'GRN Completed' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('invoice must be attached');
    });
  });

  describe('GET /api/local-purchases/:id/approval-history', () => {
    it('should return approval history for a record', async () => {
      // First approve the record
      await request(app)
        .post(`/api/local-purchases/${testPurchase.id}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ remarks: 'Approved by manager' });

      const res = await request(app)
        .get(`/api/local-purchases/${testPurchase.id}/approval-history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe('Approved');
      expect(res.body.data[0].remarks).toBe('Approved by manager');
      expect(res.body.data[0].actor).toBeDefined();
      expect(res.body.data[0].actor.username).toBe('appr_manager');
    });

    it('should return empty history for a new record', async () => {
      const res = await request(app)
        .get(`/api/local-purchases/${testPurchase.id}/approval-history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 404 for non-existent record', async () => {
      const res = await request(app)
        .get('/api/local-purchases/00000000-0000-0000-0000-000000000000/approval-history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should allow Viewer to view approval history', async () => {
      const res = await request(app)
        .get(`/api/local-purchases/${testPurchase.id}/approval-history`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
