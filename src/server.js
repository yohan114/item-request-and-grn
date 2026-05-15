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
