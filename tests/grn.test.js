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
      .get('/api/grns?status=Submitted')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(record => {
      expect(record.status).toBe('Submitted');
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

describe('GRN - Full Workflow', () => {
  let engineerUser, engineerToken;
  let workflowMRNId, workflowMRNNumber;
  let receivedItemIds = [];
  let workflowGRNId;

  beforeAll(async () => {
    const password = await hashPassword('password123');
    engineerUser = await User.create({
      username: 'grn_engineer',
      email: 'grn_engineer@test.com',
      password,
      full_name: 'GRN Engineer',
      role: 'Engineer',
      is_active: true
    });
    engineerToken = generateToken({ id: engineerUser.id, username: engineerUser.username, role: engineerUser.role });

    // Create MRN with items
    const mrnRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'GRN Workflow Test',
        items: [
          { item_name: 'Widget A', description: 'A widget', quantity: 10, unit: 'pcs', remarks: 'Urgent' },
          { item_name: 'Widget B', description: 'B widget', quantity: 5, unit: 'kg' }
        ]
      });

    workflowMRNId = mrnRes.body.data.id;
    workflowMRNNumber = mrnRes.body.data.mrn_number;

    // Submit the MRN
    await request(app)
      .post(`/api/mrns/${workflowMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    // Approve the MRN (engineer approves)
    await request(app)
      .post(`/api/mrns/${workflowMRNId}/approve`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ approval_remarks: 'Looks good' });

    // Create received items for the approved MRN
    const ri1Res = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: workflowMRNId,
        mrn_number: workflowMRNNumber,
        item_details: { item_name: 'Widget A', description: 'A widget', quantity: 10 },
        received_qty: 10,
        item_index: 0
      });

    const ri2Res = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: workflowMRNId,
        mrn_number: workflowMRNNumber,
        item_details: { item_name: 'Widget B', description: 'B widget', quantity: 5 },
        received_qty: 5,
        item_index: 1
      });

    receivedItemIds = [ri1Res.body.data.id, ri2Res.body.data.id];
  });

  it('should create GRN from received items with status=Submitted', async () => {
    const res = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        supplier_name: 'Workflow Supplier',
        project_name: 'Workflow Project',
        invoice_number: 'INV-001',
        items: [
          { item_name: 'Widget A', description: 'A widget', qty: 10, price: 5 },
          { item_name: 'Widget B', description: 'B widget', qty: 5, price: 8 }
        ],
        mrn_id: workflowMRNId,
        received_item_ids: receivedItemIds
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Submitted');
    expect(res.body.data.mrn_id).toBe(workflowMRNId);
    workflowGRNId = res.body.data.id;
  });

  it('should mark received items as GRN Created', async () => {
    const res = await request(app)
      .get(`/api/received-items?mrn_id=${workflowMRNId}`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    expect(res.status).toBe(200);
    const items = res.body.data;
    const linkedItems = items.filter(i => receivedItemIds.includes(i.id));
    linkedItems.forEach(item => {
      expect(item.grn_status).toBe('GRN Created');
    });
  });

  it('should approve GRN and update received items to GRN Approved', async () => {
    const res = await request(app)
      .post(`/api/grns/${workflowGRNId}/approve`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ approval_remarks: 'GRN approved' });

    expect(res.status).toBe(200);
    expect(res.body.data.approval_status).toBe('Approved');
    expect(res.body.data.status).toBe('Approved');

    // Check received items
    const riRes = await request(app)
      .get(`/api/received-items?mrn_id=${workflowMRNId}`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    const items = riRes.body.data;
    const linkedItems = items.filter(i => receivedItemIds.includes(i.id));
    linkedItems.forEach(item => {
      expect(item.grn_status).toBe('GRN Approved');
    });
  });

  it('should have approval_history after approval', async () => {
    const res = await request(app)
      .get(`/api/grns/${workflowGRNId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const history = res.body.data.approval_history;
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].action).toBe('Approved');
    expect(history[0].user_name).toBeDefined();
    expect(history[0].date).toBeDefined();
  });

  it('should prevent duplicate GRN creation with same received items', async () => {
    const res = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        supplier_name: 'Duplicate Supplier',
        items: [
          { item_name: 'Widget A', description: 'A widget', qty: 10, price: 5 }
        ],
        mrn_id: workflowMRNId,
        received_item_ids: receivedItemIds
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already linked');
  });
});

describe('GRN - Rejection and Resubmit', () => {
  let engineerUser2, engineerToken2;
  let rejectMRNId, rejectReceivedItemIds = [];
  let rejectedGRNId;

  beforeAll(async () => {
    const password = await hashPassword('password123');
    engineerUser2 = await User.create({
      username: 'grn_engineer2',
      email: 'grn_engineer2@test.com',
      password,
      full_name: 'GRN Engineer 2',
      role: 'Engineer',
      is_active: true
    });
    engineerToken2 = generateToken({ id: engineerUser2.id, username: engineerUser2.username, role: engineerUser2.role });

    // Create and approve MRN
    const mrnRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'GRN Reject Test',
        items: [
          { item_name: 'Gadget X', description: 'A gadget', quantity: 20, unit: 'pcs' }
        ]
      });
    rejectMRNId = mrnRes.body.data.id;

    await request(app)
      .post(`/api/mrns/${rejectMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    await request(app)
      .post(`/api/mrns/${rejectMRNId}/approve`)
      .set('Authorization', `Bearer ${engineerToken2}`)
      .send({ approval_remarks: 'OK' });

    // Create received item
    const riRes = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: rejectMRNId,
        item_details: { item_name: 'Gadget X', description: 'A gadget', quantity: 20 },
        received_qty: 20,
        item_index: 0
      });
    rejectReceivedItemIds = [riRes.body.data.id];

    // Create GRN
    const grnRes = await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        supplier_name: 'Reject Supplier',
        items: [
          { item_name: 'Gadget X', description: 'A gadget', qty: 20, price: 15 }
        ],
        mrn_id: rejectMRNId,
        received_item_ids: rejectReceivedItemIds
      });
    rejectedGRNId = grnRes.body.data.id;
  });

  it('should reject GRN and revert received items to Pending', async () => {
    const res = await request(app)
      .post(`/api/grns/${rejectedGRNId}/reject`)
      .set('Authorization', `Bearer ${engineerToken2}`)
      .send({ approval_remarks: 'Missing invoice' });

    expect(res.status).toBe(200);
    expect(res.body.data.approval_status).toBe('Rejected');
    expect(res.body.data.status).toBe('Rejected');

    // Check received items reverted
    const riRes = await request(app)
      .get(`/api/received-items?mrn_id=${rejectMRNId}`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    const items = riRes.body.data;
    items.forEach(item => {
      expect(item.grn_status).toBe('Pending');
    });
  });

  it('should allow editing a rejected GRN (resubmit)', async () => {
    const res = await request(app)
      .put(`/api/grns/${rejectedGRNId}`)
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        supplier_name: 'Updated Reject Supplier',
        invoice_number: 'INV-RESUBMIT'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.supplier_name).toBe('Updated Reject Supplier');
    expect(res.body.data.status).toBe('Submitted');
    expect(res.body.data.approval_status).toBe('Pending');
  });
});

describe('GRN - MRN Number Filter', () => {
  let filterMRNId, filterMRNNumber;
  let filterEngToken;

  beforeAll(async () => {
    const password = await hashPassword('password123');
    const filterEng = await User.create({
      username: 'grn_filter_eng',
      email: 'grn_filter_eng@test.com',
      password,
      full_name: 'GRN Filter Eng',
      role: 'Engineer',
      is_active: true
    });
    filterEngToken = generateToken({ id: filterEng.id, username: filterEng.username, role: filterEng.role });

    // Create MRN
    const mrnRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        request_for: 'Filter Test',
        items: [
          { item_name: 'Filter Item', description: 'For filter test', quantity: 3, unit: 'pcs' }
        ]
      });
    filterMRNId = mrnRes.body.data.id;
    filterMRNNumber = mrnRes.body.data.mrn_number;

    // Submit and approve
    await request(app)
      .post(`/api/mrns/${filterMRNId}/submit`)
      .set('Authorization', `Bearer ${adminToken}`);

    await request(app)
      .post(`/api/mrns/${filterMRNId}/approve`)
      .set('Authorization', `Bearer ${filterEngToken}`)
      .send({ approval_remarks: 'OK' });

    // Create received item
    const riRes = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mrn_id: filterMRNId,
        mrn_number: filterMRNNumber,
        item_details: { item_name: 'Filter Item', description: 'For filter test', quantity: 3 },
        received_qty: 3,
        item_index: 0
      });

    // Create GRN linked to this MRN
    await request(app)
      .post('/api/grns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_name: 'Filter Supplier',
        items: [
          { item_name: 'Filter Item', description: 'For filter test', qty: 3, price: 10 }
        ],
        mrn_id: filterMRNId,
        received_item_ids: [riRes.body.data.id]
      });
  });

  it('should filter GRN list by mrn_number', async () => {
    const res = await request(app)
      .get(`/api/grns?mrn_number=${filterMRNNumber}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(grn => {
      expect(grn.mrn_id).toBe(filterMRNId);
    });
  });

  it('should return empty results for non-existent mrn_number', async () => {
    const res = await request(app)
      .get('/api/grns?mrn_number=NON-EXISTENT-MRN')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(0);
  });
});
