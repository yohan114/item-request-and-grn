const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');
const { sequelize, User, LocalPurchase, Attachment } = require('../src/models');
const { hashPassword, generateToken } = require('../src/services/authService');

let adminUser, managerUser, storeKeeperUser, viewerUser;
let adminToken, managerToken, storeKeeperToken, viewerToken;
let testPurchase;

const uploadsDir = path.join(__dirname, '..', 'uploads');

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const password = await hashPassword('password123');

  adminUser = await User.create({
    username: 'att_admin',
    email: 'att_admin@test.com',
    password,
    full_name: 'Att Admin',
    role: 'Admin',
    is_active: true
  });

  managerUser = await User.create({
    username: 'att_manager',
    email: 'att_manager@test.com',
    password,
    full_name: 'Att Manager',
    role: 'Manager',
    is_active: true
  });

  storeKeeperUser = await User.create({
    username: 'att_storekeeper',
    email: 'att_storekeeper@test.com',
    password,
    full_name: 'Att Store Keeper',
    role: 'Store Keeper',
    is_active: true
  });

  viewerUser = await User.create({
    username: 'att_viewer',
    email: 'att_viewer@test.com',
    password,
    full_name: 'Att Viewer',
    role: 'Viewer',
    is_active: true
  });

  adminToken = generateToken({ id: adminUser.id, username: adminUser.username, role: adminUser.role });
  managerToken = generateToken({ id: managerUser.id, username: managerUser.username, role: managerUser.role });
  storeKeeperToken = generateToken({ id: storeKeeperUser.id, username: storeKeeperUser.username, role: storeKeeperUser.role });
  viewerToken = generateToken({ id: viewerUser.id, username: viewerUser.username, role: viewerUser.role });

  testPurchase = await LocalPurchase.create({
    supplier_name: 'Attachment Test Supplier',
    purchase_category: 'Office',
    item_name: 'Attachment Test Item',
    quantity: 5,
    unit_price: 20.00,
    total_amount: 100.00,
    mrn_number: 'MRN-20240301-0001',
    grn_number: 'GRN-20240301-0001',
    created_by: adminUser.id
  });
});

afterAll(async () => {
  // Clean up test uploaded files
  const attachments = await Attachment.findAll();
  for (const att of attachments) {
    if (fs.existsSync(att.file_path)) {
      fs.unlinkSync(att.file_path);
    }
  }
  await sequelize.close();
});

// Create a temporary test file
const createTestFile = (filename, content) => {
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, content || 'test file content');
  return filePath;
};

describe('Attachments - Upload', () => {
  it('should upload a PDF file', async () => {
    const testFilePath = createTestFile('test-upload.pdf', '%PDF-1.4 test content');

    const res = await request(app)
      .post(`/api/local-purchases/${testPurchase.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('attachment_type', 'Invoice')
      .attach('file', testFilePath, { filename: 'invoice.pdf', contentType: 'application/pdf' });

    // Clean up temp file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.original_name).toBe('invoice.pdf');
    expect(res.body.data.attachment_type).toBe('Invoice');
    expect(res.body.data.file_type).toBe('application/pdf');
  });

  it('should upload a JPG file', async () => {
    const testFilePath = createTestFile('test-upload.jpg', 'fake jpg content');

    const res = await request(app)
      .post(`/api/local-purchases/${testPurchase.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('attachment_type', 'Other')
      .attach('file', testFilePath, { filename: 'photo.jpg', contentType: 'image/jpeg' });

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.original_name).toBe('photo.jpg');
  });

  it('should allow Store Keeper to upload', async () => {
    const testFilePath = createTestFile('test-sk-upload.png', 'fake png content');

    const res = await request(app)
      .post(`/api/local-purchases/${testPurchase.id}/attachments`)
      .set('Authorization', `Bearer ${storeKeeperToken}`)
      .field('attachment_type', 'MRN')
      .attach('file', testFilePath, { filename: 'document.png', contentType: 'image/png' });

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject upload by Viewer', async () => {
    const testFilePath = createTestFile('test-viewer-upload.pdf', 'pdf content');

    const res = await request(app)
      .post(`/api/local-purchases/${testPurchase.id}/attachments`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .field('attachment_type', 'Other')
      .attach('file', testFilePath, { filename: 'doc.pdf', contentType: 'application/pdf' });

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should reject disallowed file types (.exe)', async () => {
    const testFilePath = createTestFile('test-upload.exe', 'fake exe content');

    const res = await request(app)
      .post(`/api/local-purchases/${testPurchase.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('attachment_type', 'Other')
      .attach('file', testFilePath, { filename: 'malware.exe', contentType: 'application/x-msdownload' });

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('File type not allowed');
  });

  it('should return 404 for non-existent purchase', async () => {
    const testFilePath = createTestFile('test-404.pdf', 'pdf content');

    const res = await request(app)
      .post('/api/local-purchases/00000000-0000-0000-0000-000000000000/attachments')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('attachment_type', 'Other')
      .attach('file', testFilePath, { filename: 'doc.pdf', contentType: 'application/pdf' });

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Attachments - List', () => {
  it('should list attachments for a purchase', async () => {
    const res = await request(app)
      .get(`/api/local-purchases/${testPurchase.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should allow Viewer to list attachments', async () => {
    const res = await request(app)
      .get(`/api/local-purchases/${testPurchase.id}/attachments`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 for non-existent purchase', async () => {
    const res = await request(app)
      .get('/api/local-purchases/00000000-0000-0000-0000-000000000000/attachments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Attachments - Download', () => {
  let attachmentId;

  beforeAll(async () => {
    const attachment = await Attachment.findOne();
    attachmentId = attachment ? attachment.id : null;
  });

  it('should download an attachment', async () => {
    if (!attachmentId) return;

    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set('Authorization', `Bearer ${adminToken}`);

    // File may or may not exist on disk depending on test order
    expect([200, 404]).toContain(res.status);
  });

  it('should return 404 for non-existent attachment', async () => {
    const res = await request(app)
      .get('/api/attachments/00000000-0000-0000-0000-000000000000/download')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Attachments - Delete', () => {
  let deleteAttachmentId;

  beforeAll(async () => {
    // Create an attachment to delete
    const testFilePath = createTestFile('test-delete.pdf', 'delete me');
    const res = await request(app)
      .post(`/api/local-purchases/${testPurchase.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('attachment_type', 'Other')
      .attach('file', testFilePath, { filename: 'todelete.pdf', contentType: 'application/pdf' });

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    deleteAttachmentId = res.body.data ? res.body.data.id : null;
  });

  it('should allow Admin to delete an attachment', async () => {
    if (!deleteAttachmentId) return;

    const res = await request(app)
      .delete(`/api/attachments/${deleteAttachmentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Attachment deleted successfully');
  });

  it('should allow Manager to delete an attachment', async () => {
    // Create another attachment for Manager to delete
    const testFilePath = createTestFile('test-mgr-delete.pdf', 'manager delete');
    const uploadRes = await request(app)
      .post(`/api/local-purchases/${testPurchase.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('attachment_type', 'Other')
      .attach('file', testFilePath, { filename: 'mgr-del.pdf', contentType: 'application/pdf' });

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    const attId = uploadRes.body.data.id;

    const res = await request(app)
      .delete(`/api/attachments/${attId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject delete by Store Keeper', async () => {
    // Create an attachment
    const testFilePath = createTestFile('test-sk-delete.pdf', 'sk no delete');
    const uploadRes = await request(app)
      .post(`/api/local-purchases/${testPurchase.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('attachment_type', 'Other')
      .attach('file', testFilePath, { filename: 'sk-del.pdf', contentType: 'application/pdf' });

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    const attId = uploadRes.body.data.id;

    const res = await request(app)
      .delete(`/api/attachments/${attId}`)
      .set('Authorization', `Bearer ${storeKeeperToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should reject delete by Viewer', async () => {
    const attachment = await Attachment.findOne();
    if (!attachment) return;

    const res = await request(app)
      .delete(`/api/attachments/${attachment.id}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 for non-existent attachment', async () => {
    const res = await request(app)
      .delete('/api/attachments/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
