import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="card-header">
        <h1 className="card-title">Dashboard</h1>
      </div>

      <div className="card mb-xl">
        <h2>Welcome back, {user?.firstName}!</h2>
        <p className="mb-0">
          You're managing the ledger for <strong>{user?.client?.name || user?.clientName}</strong>
        </p>
      </div>

      <div className="card mb-xl">
        <h3>Quick Start Guide</h3>
        <p>Get started with your accounting ledger in three simple steps:</p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Step 1</div>
            <h4>Setup Accounts</h4>
            <p>
              Visit the <strong>Accounts</strong> page to view and customize your chart of accounts.
              Add new accounts specific to your business needs.
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-label">Step 2</div>
            <h4>Record Transactions</h4>
            <p>
              Go to <strong>Transactions</strong> to create journal entries.
              The system enforces double-entry bookkeeping automatically.
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-label">Step 3</div>
            <h4>View Reports</h4>
            <p>
              Check the <strong>Reports</strong> page for trial balance, income statement,
              and balance sheet to analyze your financial position.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>About This Application</h3>
        <p>This is a professional multi-client accounting ledger system with the following features:</p>

        <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Double-Entry Bookkeeping:</strong> Every transaction must balance (debits = credits)
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Client Isolation:</strong> Your data is completely isolated from other clients
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Standard Account Types:</strong> Assets, Liabilities, Equity, Revenue, and Expenses
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Financial Reports:</strong> Automated trial balance, P&L, and balance sheet generation
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>Secure Authentication:</strong> JWT-based authentication with bcrypt password hashing
          </li>
        </ul>
      </div>
    </div>
  );
}
