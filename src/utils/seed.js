require('dotenv').config();

const { sequelize, User } = require('../models');
const { hashPassword } = require('../services/authService');

const seed = async () => {
  try {
    await sequelize.sync();

    const adminExists = await User.findOne({ where: { username: 'admin' } });

    if (!adminExists) {
      const hashedPassword = await hashPassword('admin123');
      await User.create({
        username: 'admin',
        email: 'admin@localhost.com',
        password: hashedPassword,
        full_name: 'System Administrator',
        role: 'Admin',
        is_active: true
      });
      console.log('Default admin user created');
    } else {
      console.log('Admin user already exists');
    }

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  seed();
}

module.exports = { seed };
