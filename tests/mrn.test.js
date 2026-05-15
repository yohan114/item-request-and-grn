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

describe('MRN - Submit', () => {
  let submitMRNId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Submit Test',
        items: [
          { item_name: 'Submit Item', description: 'For submit test', quantity: 5, unit: 'pcs' }
        ]
      });
    submitMRNId = res.body.data.id;
  });

  it('should submit a Draft MRN successfully', async () => {
    const res = await request(app)
      .post(`/api/mrns/${submitMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Submitted');
  });

  it('should reject submitting a non-Draft MRN', async () => {
    const res = await request(app)
      .post(`/api/mrns/${submitMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Draft');
  });

  it('should reject submit by a Store Keeper who is not the creator', async () => {
    // Create another store keeper
    const password = await hashPassword('password123');
    const otherSK = await User.create({
      username: 'mrn_other_sk',
      email: 'mrn_other_sk@test.com',
      password,
      full_name: 'Other SK',
      role: 'Store Keeper',
      is_active: true
    });
    const otherSKToken = generateToken({ id: otherSK.id, username: otherSK.username, role: otherSK.role });

    // Create a new Draft MRN by original store keeper
    const createRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Other SK Test',
        items: [
          { item_name: 'Test Item', description: 'Desc', quantity: 1 }
        ]
      });

    const res = await request(app)
      .post(`/api/mrns/${createRes.body.data.id}/submit`)
      .set('Authorization', `Bearer ${otherSKToken}`);

    expect(res.status).toBe(403);
  });

  it('should allow Admin to submit any MRN', async () => {
    const createRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Admin Submit Test',
        items: [
          { item_name: 'Admin Item', description: 'Desc', quantity: 2 }
        ]
      });

    const res = await request(app)
      .post(`/api/mrns/${createRes.body.data.id}/submit`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Submitted');
  });
});

describe('MRN - Approval Flow', () => {
  let engineerUser, engineerToken;
  let approvalMRNId;

  beforeAll(async () => {
    const password = await hashPassword('password123');
    engineerUser = await User.create({
      username: 'mrn_engineer',
      email: 'mrn_engineer@test.com',
      password,
      full_name: 'MRN Engineer',
      role: 'Engineer',
      is_active: true
    });
    engineerToken = generateToken({ id: engineerUser.id, username: engineerUser.username, role: engineerUser.role });
  });

  it('should approve a submitted MRN and set items to Approved', async () => {
    // Create MRN
    const createRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Approval Test',
        items: [
          { item_name: 'Approve Item 1', description: 'Desc 1', quantity: 10, unit: 'pcs' },
          { item_name: 'Approve Item 2', description: 'Desc 2', quantity: 5, unit: 'kg', remarks: 'Handle with care' }
        ],
        supplier_name: 'Test Supplier',
        project_name: 'Test Project'
      });
    approvalMRNId = createRes.body.data.id;

    // Submit
    await request(app)
      .post(`/api/mrns/${approvalMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    // Approve
    const res = await request(app)
      .post(`/api/mrns/${approvalMRNId}/approve`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ approval_remarks: 'All good' });

    expect(res.status).toBe(200);
    expect(res.body.data.approval_status).toBe('Approved');
    expect(res.body.data.status).toBe('Approved');

    // Check items have item_status='Approved'
    const getRes = await request(app)
      .get(`/api/mrns/${approvalMRNId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const items = getRes.body.data.items;
    items.forEach(item => {
      expect(item.item_status).toBe('Approved');
    });
  });

  it('should populate approval_history after approval', async () => {
    const res = await request(app)
      .get(`/api/mrns/${approvalMRNId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const history = res.body.data.approval_history;
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(1);
    expect(history[0].action).toBe('Approved');
    expect(history[0].user_name).toBe('MRN Engineer');
    expect(history[0].date).toBeDefined();
    expect(history[0].remarks).toBe('All good');
  });

  it('should reject a submitted MRN and return to Draft', async () => {
    // Create and submit a new MRN
    const createRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Reject Test',
        items: [
          { item_name: 'Reject Item', description: 'To be rejected', quantity: 3 }
        ]
      });
    const rejectMRNId = createRes.body.data.id;

    await request(app)
      .post(`/api/mrns/${rejectMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    // Reject
    const res = await request(app)
      .post(`/api/mrns/${rejectMRNId}/reject`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ approval_remarks: 'Quantities are wrong' });

    expect(res.status).toBe(200);
    expect(res.body.data.approval_status).toBe('Rejected');
    expect(res.body.data.status).toBe('Draft');

    // Check approval_history has rejection entry
    const getRes = await request(app)
      .get(`/api/mrns/${rejectMRNId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const history = getRes.body.data.approval_history;
    expect(history.length).toBe(1);
    expect(history[0].action).toBe('Rejected');
    expect(history[0].remarks).toBe('Quantities are wrong');
  });

  it('should allow editing and resubmitting a rejected MRN', async () => {
    // Create, submit, then reject
    const createRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Resubmit Test',
        items: [
          { item_name: 'Resubmit Item', description: 'Original', quantity: 2 }
        ]
      });
    const resubmitMRNId = createRes.body.data.id;

    await request(app)
      .post(`/api/mrns/${resubmitMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    await request(app)
      .post(`/api/mrns/${resubmitMRNId}/reject`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ approval_remarks: 'Fix description' });

    // Edit the rejected MRN
    const editRes = await request(app)
      .put(`/api/mrns/${resubmitMRNId}`)
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        items: [
          { item_name: 'Resubmit Item', description: 'Updated description', quantity: 3 }
        ]
      });

    expect(editRes.status).toBe(200);

    // Resubmit
    const submitRes = await request(app)
      .post(`/api/mrns/${resubmitMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('Submitted');
  });

  it('should not allow editing an approved MRN', async () => {
    const res = await request(app)
      .put(`/api/mrns/${approvalMRNId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        request_for: 'Should Fail'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('approved');
  });

  it('should not allow SK to approve their own MRN', async () => {
    // SK cannot approve because they are not in the authorize list for approve
    // But even if they had access, self-approval is blocked
    // Create MRN by admin
    const createRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        request_for: 'Self Approve Test',
        items: [
          { item_name: 'Self Item', description: 'Self test', quantity: 1 }
        ]
      });
    const selfMRNId = createRes.body.data.id;

    await request(app)
      .post(`/api/mrns/${selfMRNId}/submit`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Admin trying to approve their own record
    const res = await request(app)
      .post(`/api/mrns/${selfMRNId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approval_remarks: 'Self approve' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('own record');
  });

  it('should allow Engineer to approve MRN', async () => {
    const createRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Engineer Approve',
        items: [
          { item_name: 'Eng Item', description: 'Eng test', quantity: 7 }
        ]
      });
    const engMRNId = createRes.body.data.id;

    await request(app)
      .post(`/api/mrns/${engMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    const res = await request(app)
      .post(`/api/mrns/${engMRNId}/approve`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ approval_remarks: 'Engineer approves' });

    expect(res.status).toBe(200);
    expect(res.body.data.approval_status).toBe('Approved');
  });

  it('should require remarks for rejection', async () => {
    const createRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Reject No Remarks',
        items: [
          { item_name: 'No Remarks Item', description: 'Test', quantity: 1 }
        ]
      });
    const noRemarksMRNId = createRes.body.data.id;

    await request(app)
      .post(`/api/mrns/${noRemarksMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    const res = await request(app)
      .post(`/api/mrns/${noRemarksMRNId}/reject`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('required');
  });
});

describe('MRN - New Item Fields', () => {
  it('should create MRN with new item fields (item_name, quantity, unit, remarks)', async () => {
    const res = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        request_for: 'New Fields Test',
        items: [
          { item_name: 'New Widget', description: 'A new widget', quantity: 15, unit: 'pcs', remarks: 'Priority' }
        ],
        supplier_name: 'Acme Corp',
        project_name: 'Project X'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.items[0].item_name).toBe('New Widget');
    expect(res.body.data.items[0].quantity).toBe(15);
    expect(res.body.data.items[0].unit).toBe('pcs');
    expect(res.body.data.items[0].remarks).toBe('Priority');
    expect(res.body.data.items[0].item_status).toBe('Pending Approval');
  });

  it('should still support backward compatible item fields (item_no, qty)', async () => {
    const res = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        request_for: 'Compat Fields Test',
        items: [
          { item_no: 'ITEM-001', description: 'Legacy item', qty: 8 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.items[0].item_no).toBe('ITEM-001');
    expect(res.body.data.items[0].qty).toBe(8);
  });
});
