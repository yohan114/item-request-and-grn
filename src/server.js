require('dotenv').config();

const app = require('./app');
const { sequelize, User } = require('./models');
const { hashPassword } = require('./services/authService');

const PORT = process.env.APP_PORT || 3000;

const createDefaultAdmin = async () => {
  try {
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
      console.log('Default admin user created (username: admin, password: admin123)');
    }
  } catch (error) {
    console.error('Error creating default admin:', error.message);
  }
};

const startServer = async () => {
  try {
    // JWT secret startup guard
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret === 'default_secret_change_me') {
      if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: JWT_SECRET environment variable must be set in production');
        process.exit(1);
      } else {
        console.warn('WARNING: JWT_SECRET is not set or is using the default value. Do not use defaults in production.');
      }
    }

    await sequelize.sync();
    console.log('Database synced successfully');

    await createDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
