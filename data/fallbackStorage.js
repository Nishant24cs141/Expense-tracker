const fs = require('fs');
const path = require('path');

// Support Vercel serverless /tmp folder or local directory
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_FILE = isVercel
  ? path.join('/tmp', 'transactions.json')
  : path.join(__dirname, 'transactions.json');

// In-memory fallback in case filesystem is completely restricted
let memoryStore = [];

// Ensure data file exists
function ensureFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
    }
  } catch (err) {
    // Ignore error if filesystem is restricted
  }
}

function readAll() {
  try {
    ensureFile();
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(content || '[]');
      memoryStore = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('Fallback reading from memoryStore:', err.message);
  }
  return memoryStore;
}

function writeAll(data) {
  memoryStore = data;
  try {
    ensureFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('Fallback written to memoryStore:', err.message);
  }
}

module.exports = {
  find: async (query = {}) => {
    let items = readAll();
    if (query.type) {
      items = items.filter(i => i.type === query.type);
    }
    // Sort by date descending
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  create: async (data) => {
    const items = readAll();
    const newItem = {
      _id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: data.type,
      category: data.category,
      amount: parseFloat(data.amount),
      date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
      description: data.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.unshift(newItem);
    writeAll(items);
    return newItem;
  },

  findByIdAndDelete: async (id) => {
    const items = readAll();
    const index = items.findIndex(i => i._id === id);
    if (index === -1) return null;
    const removed = items.splice(index, 1)[0];
    writeAll(items);
    return removed;
  }
};
