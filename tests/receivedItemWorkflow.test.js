const request = require('supertest');
const app = require('../src/app');
const { sequelize, User, MRN, ReceivedItem } = require('../src/models');
const { hashPassword, generateToken } = require('../src/services/authService');

let adminUser, storeKeeperUser, engineerUser;
let adminToken, storeKeeperToken, engineerToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const password = await hashPassword('password123');

  adminUser = await User.create({
    username: 'ri_admin',
    email: 'ri_admin@test.com',
    password,
    full_name: 'RI Admin',
    role: 'Admin',
    is_active: true
  });

  storeKeeperUser = await User.create({
    username: 'ri_storekeeper',
    email: 'ri_storekeeper@test.com',
    password,
    full_name: 'RI Store Keeper',
    role: 'Store Keeper',
    is_active: true
  });

  engineerUser = await User.create({
    username: 'ri_engineer',
    email: 'ri_engineer@test.com',
    password,
    full_name: 'RI Engineer',
    role: 'Engineer',
    is_active: true
  });

  adminToken = generateToken({ id: adminUser.id, username: adminUser.username, role: adminUser.role });
  storeKeeperToken = generateToken({ id: storeKeeperUser.id, username: storeKeeperUser.username, role: storeKeeperUser.role });
  engineerToken = generateToken({ id: engineerUser.id, username: engineerUser.username, role: engineerUser.role });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Received Items - Cannot receive for unapproved MRN', () => {
  let draftMRNId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Unapproved MRN Test',
        items: [
          { item_name: 'Blocked Item', description: 'Should not be receivable', quantity: 10, unit: 'pcs' }
        ]
      });
    draftMRNId = res.body.data.id;
  });

  it('should return 400 when trying to receive items for a Draft MRN', async () => {
    const res = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: draftMRNId,
        item_details: { item_name: 'Blocked Item', description: 'Should not be receivable', quantity: 10 },
        received_qty: 5,
        item_index: 0
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('approved');
  });

  it('should return 400 when trying to receive items for a Submitted MRN', async () => {
    await request(app)
      .post(`/api/mrns/${draftMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    const res = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: draftMRNId,
        item_details: { item_name: 'Blocked Item', description: 'Should not be receivable', quantity: 10 },
        received_qty: 5,
        item_index: 0
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('approved');
  });
});

describe('Received Items - Partial and Full Receive Workflow', () => {
  let workflowMRNId, workflowMRNNumber;

  beforeAll(async () => {
    // Create MRN with two items
    const mrnRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Receive Workflow Test',
        items: [
          { item_name: 'Item Alpha', description: 'Alpha item', quantity: 10, unit: 'pcs' },
          { item_name: 'Item Beta', description: 'Beta item', quantity: 6, unit: 'kg' }
        ]
      });
    workflowMRNId = mrnRes.body.data.id;
    workflowMRNNumber = mrnRes.body.data.mrn_number;

    // Submit
    await request(app)
      .post(`/api/mrns/${workflowMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    // Approve
    await request(app)
      .post(`/api/mrns/${workflowMRNId}/approve`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ approval_remarks: 'Approved for receiving' });
  });

  it('should create received item for approved MRN and set status to Partially Received', async () => {
    const res = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: workflowMRNId,
        mrn_number: workflowMRNNumber,
        item_details: { item_name: 'Item Alpha', description: 'Alpha item', quantity: 10 },
        received_qty: 5,
        item_index: 0
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mrn_id).toBe(workflowMRNId);
    expect(res.body.data.received_qty).toBe(5);
    expect(res.body.data.item_index).toBe(0);

    // Check MRN status
    const mrnRes = await request(app)
      .get(`/api/mrns/${workflowMRNId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(mrnRes.body.data.status).toBe('Partially Received');
  });

  it('should track item_status as Partially Received for partially received items', async () => {
    const mrnRes = await request(app)
      .get(`/api/mrns/${workflowMRNId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const items = mrnRes.body.data.items;
    // Item Alpha is partially received (5 of 10)
    const alphaItem = items.find(i => (i.item_name || i.item_no) === 'Item Alpha');
    expect(alphaItem.item_status).toBe('Partially Received');
  });

  it('should receive remaining items and auto-close MRN', async () => {
    // Receive remaining Alpha (5 more)
    await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: workflowMRNId,
        mrn_number: workflowMRNNumber,
        item_details: { item_name: 'Item Alpha', description: 'Alpha item', quantity: 10 },
        received_qty: 5,
        item_index: 0
      });

    // Receive all Beta (6)
    const lastRes = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: workflowMRNId,
        mrn_number: workflowMRNNumber,
        item_details: { item_name: 'Item Beta', description: 'Beta item', quantity: 6 },
        received_qty: 6,
        item_index: 1
      });

    expect(lastRes.status).toBe(201);
    expect(lastRes.body.mrn_auto_closed).toBe(true);

    // Verify MRN is now Closed
    const mrnRes = await request(app)
      .get(`/api/mrns/${workflowMRNId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(mrnRes.body.data.status).toBe('Closed');
  });

  it('should show Fully Received item_status for fully received items', async () => {
    const mrnRes = await request(app)
      .get(`/api/mrns/${workflowMRNId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const items = mrnRes.body.data.items;
    items.forEach(item => {
      expect(item.item_status).toBe('Fully Received');
    });
  });
});

describe('Received Items - Over-receive enforcement', () => {
  let overReceiveMRNId, overReceiveMRNNumber;

  beforeAll(async () => {
    const mrnRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Over-receive Test',
        items: [
          { item_name: 'Limited Item', description: 'Only 10 allowed', quantity: 10, unit: 'pcs' }
        ]
      });
    overReceiveMRNId = mrnRes.body.data.id;
    overReceiveMRNNumber = mrnRes.body.data.mrn_number;

    await request(app)
      .post(`/api/mrns/${overReceiveMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    await request(app)
      .post(`/api/mrns/${overReceiveMRNId}/approve`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ approval_remarks: 'Approved' });
  });

  it('should reject received_qty that exceeds remaining quantity', async () => {
    // First receive 7 of 10
    const firstRes = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: overReceiveMRNId,
        mrn_number: overReceiveMRNNumber,
        item_details: { item_name: 'Limited Item', description: 'Only 10 allowed', quantity: 10 },
        received_qty: 7,
        item_index: 0
      });
    expect(firstRes.status).toBe(201);

    // Try to receive 5 more (only 3 remaining)
    const overRes = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: overReceiveMRNId,
        mrn_number: overReceiveMRNNumber,
        item_details: { item_name: 'Limited Item', description: 'Only 10 allowed', quantity: 10 },
        received_qty: 5,
        item_index: 0
      });

    expect(overRes.status).toBe(400);
    expect(overRes.body.success).toBe(false);
    expect(overRes.body.message).toMatch(/exceeds remaining quantity/i);
  });

  it('should allow received_qty exactly equal to remaining quantity', async () => {
    // Remaining is 3 (10 - 7), receive exactly 3
    const exactRes = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: overReceiveMRNId,
        mrn_number: overReceiveMRNNumber,
        item_details: { item_name: 'Limited Item', description: 'Only 10 allowed', quantity: 10 },
        received_qty: 3,
        item_index: 0
      });

    expect(exactRes.status).toBe(201);
    expect(exactRes.body.success).toBe(true);
  });
});

describe('Received Items - item_index tracking', () => {
  let indexMRNId;

  beforeAll(async () => {
    const mrnRes = await request(app)
      .post('/api/mrns')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        request_for: 'Index Test',
        items: [
          { item_name: 'Index Item 0', description: 'First', quantity: 5 },
          { item_name: 'Index Item 1', description: 'Second', quantity: 3 },
          { item_name: 'Index Item 2', description: 'Third', quantity: 7 }
        ]
      });
    indexMRNId = mrnRes.body.data.id;

    await request(app)
      .post(`/api/mrns/${indexMRNId}/submit`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    await request(app)
      .post(`/api/mrns/${indexMRNId}/approve`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ approval_remarks: 'OK' });
  });

  it('should store item_index correctly on received items', async () => {
    // Receive second item (index 1)
    const res = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: indexMRNId,
        item_details: { item_name: 'Index Item 1', description: 'Second', quantity: 3 },
        received_qty: 3,
        item_index: 1
      });

    expect(res.status).toBe(201);
    expect(res.body.data.item_index).toBe(1);

    // Receive third item (index 2)
    const res2 = await request(app)
      .post('/api/received-items')
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .send({
        mrn_id: indexMRNId,
        item_details: { item_name: 'Index Item 2', description: 'Third', quantity: 7 },
        received_qty: 7,
        item_index: 2
      });

    expect(res2.status).toBe(201);
    expect(res2.body.data.item_index).toBe(2);
  });
});
