require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense_tracker';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection with graceful caching for serverless
let isConnecting = false;
async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  if (isConnecting) return;
  isConnecting = true;
  try {
    const maskedUri = MONGODB_URI.includes('@') 
      ? MONGODB_URI.replace(/:([^:@]+)@/, ':****@') 
      : MONGODB_URI;
    console.log('Connecting to MongoDB at:', maskedUri);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3500
    });
    console.log('✅ MongoDB connected successfully.');
  } catch (err) {
    console.warn('⚠️  Could not connect to MongoDB:', err.message);
    console.log('💡  Fallback Mode: Project will use local data storage (data/transactions.json).');
    console.log('    To use MongoDB, ensure mongod is running or configure MONGODB_URI in .env');
  } finally {
    isConnecting = false;
  }
}

// In serverless environments (Vercel), ensure DB connection attempt is made
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState < 1 && process.env.MONGODB_URI) {
    await connectDB();
  }
  next();
});

// Initial local connect attempt
connectDB();

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes (supports both /api/transactions and /transactions)
app.use('/api', transactionRoutes);
app.use('/', transactionRoutes);

// Fallback to index.html for single page navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only listen when executed directly (node server.js), not when imported as a serverless function
if (require.main === module && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 Expense Tracker Server is running!`);
    console.log(`🌐 Open in browser: http://localhost:${PORT}`);
    console.log(`📡 API endpoint:   http://localhost:${PORT}/api/transactions`);
    console.log('====================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = Number(PORT) + 1;
      console.warn(`⚠️  Port ${PORT} is busy. Automatically switching to http://localhost:${fallbackPort}...`);
      app.listen(fallbackPort, () => {
        console.log('====================================================');
        console.log(`🚀 Expense Tracker Server is running!`);
        console.log(`🌐 Open in browser: http://localhost:${fallbackPort}`);
        console.log(`📡 API endpoint:   http://localhost:${fallbackPort}/api/transactions`);
        console.log('====================================================');
      });
    } else {
      console.error('Server error:', err);
    }
  });
}

module.exports = app;
