require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Performance Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allows inline scripts & CDNs for 1010Tool suite
}));
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Web App Directory
const wwwPath = path.join(__dirname, '..', 'www');
app.use(express.static(wwwPath));

// API Routes
app.use('/api', apiRoutes);

// Fallback for SPA/PWA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(wwwPath, 'index.html'));
});

// Centralized Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 1010Tool Server running smoothly at http://localhost:${PORT}`);
  });
}

module.exports = app;
