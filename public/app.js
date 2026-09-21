// ==========================================================================
// Smart Expense Tracker - Frontend Application Logic
// ==========================================================================

const API_BASE = '/api';

// Predefined Categories
const CATEGORIES = {
  expense: [
    '🍔 Food & Dining',
    '🏠 Rent & Housing',
    '🛒 Groceries',
    '🚗 Transportation',
    '⚡ Utilities & Bills',
    '🎬 Entertainment',
    '🛍️ Shopping',
    '💊 Healthcare',
    '📚 Education',
    '📦 Other Expense'
  ],
  income: [
    '💼 Salary',
    '💻 Freelance',
    '📈 Investments',
    '🏢 Business',
    '🎁 Gift / Bonus',
    '🪙 Allowance',
    '💰 Other Income'
  ]
};

// Application State
let allTransactions = [];
let currentFilter = 'all';
let searchQuery = '';
let currentChartType = 'doughnut';
let myChart = null;

// DOM Elements
const transactionForm = document.getElementById('transactionForm');
const txTypeRadios = document.getElementsByName('txType');
const typeExpenseLabel = document.getElementById('typeExpenseLabel');
const typeIncomeLabel = document.getElementById('typeIncomeLabel');
const txCategorySelect = document.getElementById('txCategory');
const txAmountInput = document.getElementById('txAmount');
const txDateInput = document.getElementById('txDate');
const txDescInput = document.getElementById('txDescription');
const submitBtn = document.getElementById('submitBtn');

const totalIncomeDisplay = document.getElementById('totalIncomeDisplay');
const totalExpenseDisplay = document.getElementById('totalExpenseDisplay');
const totalBalanceDisplay = document.getElementById('totalBalanceDisplay');
const incomeCountText = document.getElementById('incomeCountText');
const expenseCountText = document.getElementById('expenseCountText');
const balanceStatusPill = document.getElementById('balanceStatusPill');

const transactionListBody = document.getElementById('transactionListBody');
const tableEmptyState = document.getElementById('tableEmptyState');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.querySelectorAll('.filter-tab');

const btnChartDoughnut = document.getElementById('btnChartDoughnut');
const btnChartBar = document.getElementById('btnChartBar');
const chartCanvas = document.getElementById('expenseChart');
const chartEmptyState = document.getElementById('chartEmptyState');
const savingsRateVal = document.getElementById('savingsRateVal');
const topCategoryVal = document.getElementById('topCategoryVal');

const dbStatusBadge = document.getElementById('dbStatusBadge');
const dbStatusText = document.getElementById('dbStatusText');
const currentDateEl = document.getElementById('currentDate');
const toastEl = document.getElementById('toast');

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  txDateInput.value = today;

  // Format header date
  const now = new Date();
  currentDateEl.textContent = now.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  // Populate initial categories (default: expense)
  populateCategories('expense');

  // Attach event listeners
  setupEventListeners();

  // Initial data load
  loadDashboard();
  checkDBStatus();
});

// ==========================================================================
// Event Listeners
// ==========================================================================
function setupEventListeners() {
  // Transaction type toggle switch
  txTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const selectedType = e.target.value;
      if (selectedType === 'income') {
        typeIncomeLabel.classList.add('active');
        typeExpenseLabel.classList.remove('active');
      } else {
        typeExpenseLabel.classList.add('active');
        typeIncomeLabel.classList.remove('active');
      }
      populateCategories(selectedType);
    });
  });

  // Form submit
  transactionForm.addEventListener('submit', handleAddTransaction);

  // Filter tabs
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter');
      renderTransactions();
    });
  });

  // Search input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderTransactions();
  });

  // Chart type toggles
  btnChartDoughnut.addEventListener('click', () => {
    if (currentChartType !== 'doughnut') {
      currentChartType = 'doughnut';
      btnChartDoughnut.classList.add('active');
      btnChartBar.classList.remove('active');
      updateChart();
    }
  });

  btnChartBar.addEventListener('click', () => {
    if (currentChartType !== 'bar') {
      currentChartType = 'bar';
      btnChartBar.classList.add('active');
      btnChartDoughnut.classList.remove('active');
      updateChart();
    }
  });
}

// Populate Categories Select
function populateCategories(type) {
  const options = CATEGORIES[type] || [];
  txCategorySelect.innerHTML = options
    .map(cat => `<option value="${cat}">${cat}</option>`)
    .join('');
}

// ==========================================================================
// API Operations
// ==========================================================================

// Load entire dashboard data
async function loadDashboard() {
  await Promise.all([fetchSummary(), fetchTransactions()]);
}

// Check database status
async function checkDBStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    const data = await res.json();
    if (data.isMongoDB) {
      dbStatusBadge.className = 'db-badge connected';
      dbStatusText.textContent = 'MongoDB Connected';
    } else {
      dbStatusBadge.className = 'db-badge local';
      dbStatusText.textContent = 'Local Mode';
      dbStatusBadge.title = 'Running in fallback storage. To connect MongoDB, configure MONGODB_URI in .env';
    }
  } catch (err) {
    dbStatusBadge.className = 'db-badge local';
    dbStatusText.textContent = 'Offline';
  }
}

// Fetch financial summary
async function fetchSummary() {
  try {
    const res = await fetch(`${API_BASE}/transactions/summary`);
    const result = await res.json();

    if (result.success) {
      const summary = result.summary;
      updateKpis(summary);
      updateChart(summary);
    }
  } catch (err) {
    console.error('Error fetching summary:', err);
  }
}

// Fetch all transactions
async function fetchTransactions() {
  try {
    const res = await fetch(`${API_BASE}/transactions`);
    const result = await res.json();

    if (result.success) {
      allTransactions = result.data || [];
      renderTransactions();
    }
  } catch (err) {
    console.error('Error fetching transactions:', err);
    showToast('Failed to load transactions', 'error');
  }
}

// Add new transaction
async function handleAddTransaction(e) {
  e.preventDefault();

  const type = document.querySelector('input[name="txType"]:checked').value;
  const category = txCategorySelect.value;
  const amount = parseFloat(txAmountInput.value);
  const date = txDateInput.value;
  const description = txDescInput.value.trim();

  if (!amount || amount <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').textContent = 'Saving...';

  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, category, amount, date, description })
    });

    const result = await res.json();

    if (result.success) {
      showToast(`${type === 'income' ? 'Income' : 'Expense'} added successfully!`, 'success');
      // Reset form
      txAmountInput.value = '';
      txDescInput.value = '';
      // Refresh dashboard
      await loadDashboard();
    } else {
      showToast(result.message || 'Error saving transaction', 'error');
    }
  } catch (err) {
    console.error('Error adding transaction:', err);
    showToast('Server connection failed', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').textContent = 'Save Transaction';
  }
}

// Delete transaction
async function deleteTransaction(id) {
  if (!confirm('Are you sure you want to delete this transaction?')) return;

  try {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE'
    });

    const result = await res.json();

    if (result.success) {
      showToast('Transaction deleted', 'success');
      await loadDashboard();
    } else {
      showToast(result.message || 'Error deleting transaction', 'error');
    }
  } catch (err) {
    console.error('Error deleting transaction:', err);
    showToast('Failed to delete transaction', 'error');
  }
}

// ==========================================================================
// UI Rendering
// ==========================================================================

// Update KPI cards
function updateKpis(summary) {
  const { totalIncome, totalExpense, balance } = summary;

  totalIncomeDisplay.textContent = formatCurrency(totalIncome);
  totalExpenseDisplay.textContent = formatCurrency(totalExpense);
  totalBalanceDisplay.textContent = formatCurrency(balance);

  // Subtext counts
  const incomeTxCount = allTransactions.filter(t => t.type === 'income').length;
  const expenseTxCount = allTransactions.filter(t => t.type === 'expense').length;
  incomeCountText.textContent = `${incomeTxCount} transaction${incomeTxCount !== 1 ? 's' : ''}`;
  expenseCountText.textContent = `${expenseTxCount} transaction${expenseTxCount !== 1 ? 's' : ''}`;

  // Balance status pill
  if (balance > 0) {
    balanceStatusPill.textContent = 'Positive Balance';
    balanceStatusPill.className = 'kpi-pill positive';
  } else if (balance < 0) {
    balanceStatusPill.textContent = 'Deficit';
    balanceStatusPill.className = 'kpi-pill negative';
  } else {
    balanceStatusPill.textContent = 'Balanced';
    balanceStatusPill.className = 'kpi-pill';
  }

  // Calculate savings rate
  if (totalIncome > 0) {
    const savingsPercent = Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100));
    savingsRateVal.textContent = `${savingsPercent}%`;
  } else {
    savingsRateVal.textContent = '0%';
  }

  // Top expense category
  const expenseCats = summary.categoryBreakdown ? summary.categoryBreakdown.expense : {};
  let topCat = 'None';
  let maxSpend = 0;
  for (const [cat, amt] of Object.entries(expenseCats || {})) {
    if (amt > maxSpend) {
      maxSpend = amt;
      topCat = cat;
    }
  }
  topCategoryVal.textContent = topCat;
}

// Render transactions in table
function renderTransactions() {
  // Filter by type
  let filtered = allTransactions;
  if (currentFilter !== 'all') {
    filtered = filtered.filter(tx => tx.type === currentFilter);
  }

  // Filter by search query
  if (searchQuery) {
    filtered = filtered.filter(tx =>
      (tx.description && tx.description.toLowerCase().includes(searchQuery)) ||
      (tx.category && tx.category.toLowerCase().includes(searchQuery))
    );
  }

  // Empty state check
  if (filtered.length === 0) {
    transactionListBody.innerHTML = '';
    tableEmptyState.style.display = 'block';
    return;
  }

  tableEmptyState.style.display = 'none';

  transactionListBody.innerHTML = filtered.map(tx => {
    const isIncome = tx.type === 'income';
    const amountPrefix = isIncome ? '+ ' : '- ';
    const amountClass = isIncome ? 'income' : 'expense';
    const typeLabel = isIncome ? 'Income' : 'Expense';
    const dateFormatted = formatDate(tx.date);

    return `
      <tr>
        <td>
          <span class="type-badge ${tx.type}">
            ${isIncome ? '⬆️' : '⬇️'} ${typeLabel}
          </span>
        </td>
        <td>
          <span class="category-tag">${escapeHtml(tx.category)}</span>
        </td>
        <td>
          <span class="desc-text" title="${escapeHtml(tx.description || 'No description')}">
            ${escapeHtml(tx.description || '—')}
          </span>
        </td>
        <td>
          <span class="date-text">${dateFormatted}</span>
        </td>
        <td class="text-right">
          <span class="amount-text ${amountClass}">
            ${amountPrefix}${formatCurrency(tx.amount)}
          </span>
        </td>
        <td class="text-center">
          <button class="btn-delete" onclick="deleteTransaction('${tx._id}')" title="Delete Transaction">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// Chart.js Visualization
// ==========================================================================
function updateChart(summaryData) {
  // If summaryData is not provided, compute from current allTransactions
  let totalIncome = 0;
  let totalExpense = 0;

  if (summaryData) {
    totalIncome = summaryData.totalIncome;
    totalExpense = summaryData.totalExpense;
  } else {
    allTransactions.forEach(t => {
      if (t.type === 'income') totalIncome += Number(t.amount);
      if (t.type === 'expense') totalExpense += Number(t.amount);
    });
  }

  // Check if chart has data
  if (totalIncome === 0 && totalExpense === 0) {
    chartCanvas.style.display = 'none';
    chartEmptyState.style.display = 'block';
    if (myChart) {
      myChart.destroy();
      myChart = null;
    }
    return;
  }

  chartCanvas.style.display = 'block';
  chartEmptyState.style.display = 'none';

  if (myChart) {
    myChart.destroy();
  }

  const ctx = chartCanvas.getContext('2d');

  if (currentChartType === 'doughnut') {
    myChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Total Income', 'Total Expense'],
        datasets: [{
          data: [totalIncome, totalExpense],
          backgroundColor: ['#10b981', '#f43f5e'],
          hoverBackgroundColor: ['#059669', '#e11d48'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
              padding: 16,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.label}: ₹${context.raw.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
              }
            }
          }
        }
      }
    });
  } else {
    // Bar Chart
    myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Total Income', 'Total Expense'],
        datasets: [{
          label: 'Amount (₹)',
          data: [totalIncome, totalExpense],
          backgroundColor: ['rgba(16, 185, 129, 0.85)', 'rgba(244, 63, 94, 0.85)'],
          borderColor: ['#10b981', '#f43f5e'],
          borderWidth: 1.5,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₹' + value.toLocaleString('en-IN');
              },
              font: { family: 'Plus Jakarta Sans', size: 11 }
            },
            grid: {
              color: '#f1f5f9'
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` Amount: ₹${context.raw.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
              }
            }
          }
        }
      }
    });
  }
}

// ==========================================================================
// Helper Utilities
// ==========================================================================

// Format Indian Currency Number (₹)
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Format Date string
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Show Toast Notification
let toastTimeout;
function showToast(message, type = 'success') {
  clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.className = `toast show ${type}`;

  toastTimeout = setTimeout(() => {
    toastEl.className = 'toast';
  }, 3200);
}

// Safe string escaping for HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
