# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-client accounting ledger application with PostgreSQL database, Express.js API backend, and React frontend. Implements double-entry bookkeeping with client-based data isolation.

## Repository Structure

- `api/` - Express.js backend server (CommonJS)
- `web/` - React frontend application (ES modules)

## Development Commands

### Backend (api/)

```bash
cd api
npm install              # Install dependencies
npm start                # Start Express server on port 3000
npm run seed             # Seed database with demo data
npx prisma studio        # Open Prisma Studio (visual database browser)
npx prisma migrate dev   # Create new migration after schema changes
npx prisma generate      # Regenerate Prisma client after schema changes
```

### Frontend (web/)

```bash
cd web
npm install          # Install dependencies
npm run dev          # Start Vite dev server with HMR (port 5173)
npm run build        # Build production bundle
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

### Initial Setup

```bash
# 1. Install dependencies
cd api && npm install
cd ../web && npm install

# 2. Configure database
cd ../api
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 3. Run migrations and seed
npx prisma migrate dev --name init
npx prisma generate
npm run seed

# 4. Run both servers (in separate terminals)
# Terminal 1:
cd api && npm start

# Terminal 2:
cd web && npm run dev
```

Access: Frontend at http://localhost:5173, API at http://localhost:3000/api

Demo credentials: `demo@example.com` / `password123`

## Architecture

### Database (PostgreSQL + Prisma)

**Schema Location**: `api/prisma/schema.prisma`

**Models**:
- **Client**: Business entity (one per user in current implementation)
  - Each client has isolated data (accounts, transactions)
- **User**: User accounts (one user per client)
  - Authenticated via JWT tokens containing userId and clientId
- **Account**: Chart of accounts entries
  - Types: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  - Unique code per client
- **Transaction**: Business events (invoices, payments, etc.)
  - Contains multiple ledger entries
- **LedgerEntry**: Individual debit/credit entries
  - Implements double-entry bookkeeping
  - Type: "DEBIT" or "CREDIT"
  - Amount stored as Decimal(15,2)

**Critical Constraints**:
- All transactions MUST be balanced (debits = credits)
- Account codes must be unique within a client
- All client data cascades on delete
- Ledger entries prevent account deletion (Restrict)

### Backend (api/)

**Framework**: Express.js 4.16.x with CommonJS (require/module.exports)

**Entry Point**: `bin/www` - HTTP server setup and port configuration (default 3000)

**Application Structure**:
- `app.js` - Express app configuration, CORS, API route mounting, error handling
- `db/client.js` - Prisma client singleton
- `utils/` - JWT token generation/verification, password hashing (bcrypt)
- `middleware/`
  - `auth.js` - JWT authentication, extracts user from token → req.user
  - `authorize.js` - Client-based authorization, adds req.clientFilter
  - `validate.js` - Express-validator error handling
- `routes/` - API endpoints (all return JSON)
  - `/api/auth` - Register, login, get current user
  - `/api/accounts` - CRUD for chart of accounts, balance calculation
  - `/api/transactions` - CRUD with double-entry validation
  - `/api/reports` - Trial balance, income statement, balance sheet

**Authentication & Authorization Flow**:
1. User logs in → receives JWT token with {userId, clientId, email}
2. Frontend stores token in localStorage
3. Token sent in Authorization header: `Bearer <token>`
4. `authenticate` middleware verifies token → sets req.user
5. `authorizeClient` middleware adds req.clientFilter = {clientId}
6. All queries automatically filtered by clientId
7. `validateClientOwnership()` verifies resource ownership before operations

**Critical Business Logic**:
- **Double-Entry Validation** (routes/transactions.js:95-105):
  - Sum all DEBIT entries
  - Sum all CREDIT entries
  - Reject if difference > 0.01
- **Account Balance Calculation** (routes/accounts.js:175-182):
  - Debit-normal (ASSET, EXPENSE): balance = debits - credits
  - Credit-normal (LIABILITY, EQUITY, REVENUE): balance = credits - debits
- **Client Isolation**: Every query uses `where: {...req.clientFilter}` to prevent cross-client data access

### Frontend (web/)

**Framework**: React 19.2.x with Vite 7.x

**Module System**: ES modules (import/export)

**Entry Point**: `src/main.jsx` - React root setup with StrictMode

**Application Structure**:
- `src/App.jsx` - React Router setup with protected routes
- `src/services/api.js` - Axios instance with auth interceptors
- `src/context/AuthContext.jsx` - Global auth state (user, login, register, logout)
- `src/components/`
  - `Layout.jsx` - Navigation sidebar with user info
  - `ProtectedRoute.jsx` - Route guard requiring authentication
- `src/pages/`
  - `Login.jsx` & `Register.jsx` - Authentication pages
  - `Dashboard.jsx` - Welcome screen
  - `Accounts.jsx` - Chart of accounts management
  - `Transactions.jsx` - Journal entry form with double-entry UI
  - `Reports.jsx` - Financial reports (trial balance, P&L, balance sheet)

**Routing Structure** (React Router):
```
/login - Public
/register - Public
/ - Protected (Layout wrapper)
  ├─ /dashboard - Dashboard
  ├─ /accounts - Accounts
  ├─ /transactions - Transactions
  └─ /reports - Reports
```

**Authentication Flow**:
1. AuthContext checks localStorage for token on mount
2. If token exists, validates with API (`GET /api/auth/me`)
3. Axios interceptor adds token to all requests
4. On 401 error, clears localStorage and redirects to /login
5. ProtectedRoute checks auth state, redirects unauthenticated users

**Vite Configuration**: Proxy `/api` requests to `http://localhost:3000` for dev server

## Key Patterns

### Adding Backend API Endpoints

1. Create route handler in `api/routes/`
2. Apply `authenticate` and `authorizeClient` middleware
3. Use `req.clientFilter` in all database queries
4. Use `validateClientOwnership()` for single-resource operations
5. Mount route in `api/app.js`

Example:
```javascript
router.use(authenticate);
router.use(authorizeClient);

router.get('/', async (req, res) => {
  const resources = await prisma.resource.findMany({
    where: { ...req.clientFilter } // Auto-filters by clientId
  });
  res.json({ resources });
});
```

### Adding Frontend Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.jsx`
3. Use `useAuth()` hook to access user state
4. Import API functions from `src/services/api.js`
5. Handle loading/error states

### Double-Entry Bookkeeping Rules

**Every transaction requires**:
- At least 2 ledger entries
- Sum of DEBIT amounts = Sum of CREDIT amounts
- Validation enforced in backend (routes/transactions.js)
- Frontend helper shows balance status in real-time

**Account Types**:
- **Debit increases**: ASSET, EXPENSE
- **Credit increases**: LIABILITY, EQUITY, REVENUE

### Database Migrations

When modifying `api/prisma/schema.prisma`:
```bash
cd api
npx prisma migrate dev --name description_of_change
npx prisma generate  # Regenerate client
```

For production:
```bash
npx prisma migrate deploy
```

## Environment Variables

### Backend (api/.env)

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/ledger_db?schema=public"
JWT_SECRET="secure-random-string"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

### Frontend (web/.env)

```env
VITE_API_URL=http://localhost:3000/api
```

## Security Features

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens with configurable expiration
- CORS restricted to FRONTEND_URL
- Client-based authorization on all protected endpoints
- Prisma parameterized queries prevent SQL injection
- Input validation with express-validator

## Common Development Tasks

### Resetting Database

```bash
cd api
npx prisma migrate reset  # WARNING: Deletes all data
npm run seed              # Re-populate with demo data
```

### Viewing Database

```bash
cd api
npx prisma studio  # Opens http://localhost:5555
```

### Adding New Account to Chart

1. Use frontend: Accounts page → "Add Account"
2. Or via API: `POST /api/accounts` with {code, name, type, description}
3. Or via seed script: Add to accounts array in `prisma/seed.js`

### Creating Transactions

Must include balanced entries:
```json
{
  "date": "2025-01-15",
  "description": "Office supplies purchase",
  "reference": "INV-1234",
  "entries": [
    {"accountId": "...", "amount": "150.00", "type": "DEBIT"},
    {"accountId": "...", "amount": "150.00", "type": "CREDIT"}
  ]
}
```

## Testing Client Isolation

1. Register two different clients via frontend
2. Log in as Client A, create accounts/transactions
3. Log in as Client B, verify you only see Client B's data
4. Attempt to access Client A's resource by ID via API → should return 403

## Troubleshooting

**"Invalid or expired token"**:
- Check JWT_SECRET matches between sessions
- Token may have expired (check JWT_EXPIRES_IN)
- Clear localStorage and re-login

**"Transaction not balanced"**:
- Verify sum of debits equals sum of credits
- Check for floating-point precision issues
- Use exactly 2 decimal places for amounts

**Prisma client errors**:
- Run `npx prisma generate` after schema changes
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running

**CORS errors**:
- Verify FRONTEND_URL in api/.env matches your frontend port
- Check Vite proxy configuration in web/vite.config.js
