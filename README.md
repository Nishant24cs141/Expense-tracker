# 💰 Smart Expense Tracker - College Mini Project

A professional, full-stack **Expense Tracker** web application designed for personal finance management. Built with clean semantic **HTML5**, modern responsive **CSS3**, dynamic client-side **JavaScript**, **Node.js**, **Express.js**, **MongoDB (Mongoose)**, and **Chart.js**.

---

## 🌟 Key Features

* **Add Income & Expense**: Easy-to-use form with segmented switcher and contextual category suggestions.
* **Complete Metadata**: Record Category, Amount, Date, and Description for each transaction.
* **Real-time KPI Dashboard**: Instant summary cards displaying:
  * 🟢 **Total Income**
  * 🔴 **Total Expense**
  * 🔵 **Net Balance** (with positive/deficit status pills)
* **Visual Analytics**: Interactive **Chart.js** charts (toggle between Doughnut / Bar chart) showing Income vs Expense ratio and category metrics.
* **Transaction History**: Responsive table with:
  * Quick filter tabs (**All**, **Income**, **Expense**)
  * Live search bar (by description or category)
  * One-click **Delete** functionality with instant balance recalculation
* **Dual-mode Database Engine**:
  * Primary: **MongoDB** with Mongoose schema & validation
  * Resilient Fallback: Built-in local JSON file storage (`data/transactions.json`) so the project runs immediately on any computer even if MongoDB is not pre-installed or running!
* **Responsive Modern UI**: Clean design with Google Fonts (`Plus Jakarta Sans`), sleek cards, micro-interactions, and mobile/tablet optimization.

---

## 🛠️ Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Responsive user interface, DOM manipulation, client-side validation |
| **Data Visualization** | Chart.js (CDN) | Dynamic doughnut and bar charts for financial breakdown |
| **Backend Server** | Node.js & Express.js | RESTful API server, routing, static asset serving |
| **Database** | MongoDB & Mongoose ORM | Persistent transaction storage with schema validation |
| **Environment** | dotenv, cors | Config management and cross-origin handling |

---

## 📁 Project Structure

```
Tracker/
├── api/
│   └── index.js                # Vercel serverless function entrypoint
├── public/                     # Frontend static assets (served by Express & Vercel CDN)
│   ├── index.html              # Dashboard layout, KPI cards, form & chart
│   ├── style.css               # Clean modern styling & responsive design
│   └── app.js                  # Frontend controllers, Chart.js & API fetch
├── models/
│   └── Transaction.js          # Mongoose schema for transactions
├── routes/
│   └── transactionRoutes.js    # REST API endpoints (GET, POST, DELETE, Summary)
├── data/
│   ├── fallbackStorage.js      # Resilient offline/serverless storage handler
│   └── transactions.json       # Auto-created fallback dataset
├── .env                        # Server configuration (PORT, MONGODB_URI)
├── .env.example                # Example environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Project dependencies and start scripts
├── server.js                   # Application entry point & DB connection
├── vercel.json                 # Vercel serverless deployment routing
└── README.md                   # Complete documentation & viva guide
```

---

## 🚀 Getting Started

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (version 16 or higher)
* (Optional) [MongoDB Community Server](https://www.mongodb.com/try/download/community) or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cloud URI.

### 2. Installation
Open your terminal in the project directory:

```bash
npm install
```

### 3. Configure Database (Optional)
Check the `.env` file in the root folder:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/expense_tracker
```
* If you have MongoDB installed locally or on MongoDB Atlas, put your connection string in `MONGODB_URI`.
* **If you don't have MongoDB running yet, no problem!** The application will automatically detect this and switch to local storage mode so you can demo the project without any setup.

### 4. Run the Application
Start the server:
```bash
npm start
```

For live reload during development:
```bash
npm run dev
```

Open your browser and navigate to:
👉 **`http://localhost:5000`**

---

## 📡 REST API Reference

| Method | Endpoint | Description | Sample Request Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/transactions` | Retrieve all transactions (supports `?type=income` or `?type=expense`) | — |
| `POST` | `/api/transactions` | Create new income or expense transaction | `{"type":"income", "category":"Salary", "amount":45000, "date":"2026-09-21", "description":"Monthly stipend"}` |
| `DELETE` | `/api/transactions/:id` | Delete transaction by ID | — |
| `GET` | `/api/transactions/summary`| Calculate Total Income, Total Expense, Net Balance, and Category stats | — |
| `GET` | `/api/status` | Health check & database connection status | — |

---

## 🚢 Deploying to Vercel

You can deploy this project to [Vercel](https://vercel.com) in 2 simple ways:

### Method A: Deploy via GitHub (Recommended)

1. **Initialize Git & Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Expense Tracker"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
   git push -u origin main
   ```

2. **Import Project into Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **"Add New..."** ➔ **"Project"**.
   - Select your `expense-tracker` GitHub repository and click **Import**.

3. **Configure Environment Variables**:
   - In the **Environment Variables** section on Vercel, add:
     - `MONGODB_URI`: Your MongoDB Atlas connection string (e.g. `mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/expense_tracker?retryWrites=true&w=majority`)
     - `NODE_ENV`: `production`

4. **Deploy**:
   - Click **"Deploy"**.
   - Vercel will build and launch your project with a free `https://your-project.vercel.app` domain!

---

### Method B: Deploy via Vercel CLI

1. Run the deployment command in your project directory:
   ```bash
   npx vercel
   ```
2. Follow the on-screen prompts:
   - Set up and deploy? **Yes**
   - Which scope? Select your account
   - Link to existing project? **No**
   - Project name: `expense-tracker`
   - In which directory is your code located? `./`
3. Add your production MongoDB environment variable:
   ```bash
   npx vercel env add MONGODB_URI production
   ```
4. Deploy to production:
   ```bash
   npx vercel --prod
   ```

---

## 🎓 College Viva & Presentation Q&A

**Q1: What architecture does this mini project follow?**  
> **Answer**: It follows the **MVC (Model-View-Controller)** pattern:
> * **Model**: Mongoose Schema in `models/Transaction.js`.
> * **View**: Semantic HTML5 & CSS3 in `public/index.html` and `public/style.css`.
> * **Controller**: Express route handlers in `routes/transactionRoutes.js` and frontend handlers in `public/app.js`.

**Q2: How does the Income vs Expense Chart update?**  
> **Answer**: We use the **Chart.js** library. Whenever a transaction is added or deleted, the frontend invokes `loadDashboard()`, which queries `/api/transactions/summary`, gets fresh totals, and calls `myChart.update()` or recreates the chart canvas seamlessly.

**Q3: How are transactions stored securely?**  
> **Answer**: Transaction data is validated on both the client side (HTML form validation) and the server side (Express input validation & Mongoose schema validation) before being persisted to the database.

---

## 📄 License
This project is licensed under the ISC License. Free for educational and personal use.
