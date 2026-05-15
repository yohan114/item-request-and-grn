process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.JWT_EXPIRES_IN = '1h';

const { sequelize, User } = require('../src/models');
const { hashPassword } = require('../src/services/authService');

let adminUser;
let viewerUser;

const setupDatabase = async () => {
  await sequelize.sync({ force: true });

  const adminPassword = await hashPassword('admin123');
  adminUser = await User.create({
    username: 'admin',
    email: 'admin@test.com',
    password: adminPassword,
    full_name: 'Test Admin',
    role: 'Admin',
    is_active: true
  });

  const viewerPassword = await hashPassword('viewer123');
  viewerUser = await User.create({
    username: 'viewer',
    email: 'viewer@test.com',
    password: viewerPassword,
    full_name: 'Test Viewer',
    role: 'Viewer',
    is_active: true
  });

  return { adminUser, viewerUser };
};

const teardownDatabase = async () => {
  await sequelize.close();
};

module.exports = {
  setupDatabase,
  teardownDatabase,
  getAdminUser: () => adminUser,
  getViewerUser: () => viewerUser
};
