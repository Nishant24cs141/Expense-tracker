const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const fallbackStorage = require('../data/fallbackStorage');

const router = express.Router();

// Helper to determine active database engine
function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

// GET /api/transactions - Fetch all transactions
router.get('/transactions', async (req, res) => {
  try {
    const { type } = req.query;
    const query = {};
    if (type && ['income', 'expense'].includes(type)) {
      query.type = type;
    }

    let transactions;
    if (isMongoConnected()) {
      transactions = await Transaction.find(query).sort({ date: -1, createdAt: -1 });
    } else {
      transactions = await fallbackStorage.find(query);
    }

    res.json({
      success: true,
      count: transactions.length,
      data: transactions,
      storage: isMongoConnected() ? 'mongodb' : 'local'
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Server error fetching transactions', error: error.message });
  }
});

// POST /api/transactions - Create new transaction
router.post('/transactions', async (req, res) => {
  try {
    const { type, category, amount, date, description } = req.body;

    // Validation
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be either "income" or "expense"' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const payload = {
      type,
      category: category.trim(),
      amount: numAmount,
      date: new Date(date),
      description: description ? description.trim() : ''
    };

    let newTransaction;
    if (isMongoConnected()) {
      newTransaction = await Transaction.create(payload);
    } else {
      newTransaction = await fallbackStorage.create(payload);
    }

    res.status(201).json({
      success: true,
      message: 'Transaction added successfully',
      data: newTransaction,
      storage: isMongoConnected() ? 'mongodb' : 'local'
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(400).json({ success: false, message: 'Failed to create transaction', error: error.message });
  }
});

// DELETE /api/transactions/:id - Remove transaction
router.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let deleted;
    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      deleted = await Transaction.findByIdAndDelete(id);
    } else {
      deleted = await fallbackStorage.findByIdAndDelete(id);
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
      data: deleted
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ success: false, message: 'Server error deleting transaction', error: error.message });
  }
});

// GET /api/transactions/summary - Calculate metrics & categories
router.get('/transactions/summary', async (req, res) => {
  try {
    let transactions;
    if (isMongoConnected()) {
      transactions = await Transaction.find({});
    } else {
      transactions = await fallbackStorage.find({});
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryBreakdown = {
      income: {},
      expense: {}
    };

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        totalIncome += amt;
        categoryBreakdown.income[tx.category] = (categoryBreakdown.income[tx.category] || 0) + amt;
      } else if (tx.type === 'expense') {
        totalExpense += amt;
        categoryBreakdown.expense[tx.category] = (categoryBreakdown.expense[tx.category] || 0) + amt;
      }
    });

    const balance = totalIncome - totalExpense;

    res.json({
      success: true,
      summary: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
        balance: Math.round(balance * 100) / 100,
        totalTransactions: transactions.length,
        categoryBreakdown
      },
      storage: isMongoConnected() ? 'mongodb' : 'local'
    });
  } catch (error) {
    console.error('Error calculating summary:', error);
    res.status(500).json({ success: false, message: 'Server error generating summary', error: error.message });
  }
});

// GET /api/status - Check health and database status
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    database: isMongoConnected() ? 'Connected to MongoDB' : 'Running in Local Storage Mode',
    isMongoDB: isMongoConnected()
  });
});

module.exports = router;
