const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev', { skip: () => process.env.NODE_ENV === 'test' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - serve built frontend from public/dist
const distPath = path.join(__dirname, '..', 'public', 'dist');
app.use(express.static(distPath));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve uploaded files
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// API routes
app.use('/api', routes);

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.json({
      success: true,
      message: 'Local Purchase Management System API',
      version: '1.0.0'
    });
  }
});

// Error handler
app.use(errorHandler);

module.exports = app;
