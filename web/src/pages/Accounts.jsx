import { useState, useEffect } from 'react';
import { accountsAPI } from '../services/api';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'ASSET',
    description: ''
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountsAPI.list();
      setAccounts(response.data.accounts);
    } catch (err) {
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await accountsAPI.create(formData);
      setFormData({ code: '', name: '', type: 'ASSET', description: '' });
      setShowForm(false);
      loadAccounts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    }
  };

  const groupedAccounts = accounts.reduce((groups, account) => {
    if (!groups[account.type]) groups[account.type] = [];
    groups[account.type].push(account);
    return groups;
  }, {});

  if (loading) return <div className="loading">Loading accounts...</div>;

  return (
    <div>
      <div className="card-header">
        <h1 className="card-title">Chart of Accounts</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`}
        >
          {showForm ? 'Cancel' : '+ Add Account'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card mb-xl">
          <h3>Create New Account</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Account Code</label>
              <input
                type="text"
                className="form-input"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., 1000, 2000, 3000"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Cash, Accounts Receivable"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Type</label>
              <select
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="ASSET">Asset</option>
                <option value="LIABILITY">Liability</option>
                <option value="EQUITY">Equity</option>
                <option value="REVENUE">Revenue</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this account"
              />
            </div>

            <button type="submit" className="btn btn-success">
              Create Account
            </button>
          </form>
        </div>
      )}

      <div>
        {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(type => (
          groupedAccounts[type] && groupedAccounts[type].length > 0 && (
            <div key={type} className="card mb-xl">
              <div className="flex-between mb-lg">
                <h2 className="mb-0">{type}</h2>
                <span className={`badge badge-${type.toLowerCase()}`}>
                  {groupedAccounts[type].length} {groupedAccounts[type].length === 1 ? 'Account' : 'Accounts'}
                </span>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedAccounts[type].map(account => (
                      <tr key={account.id}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {account.code}
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {account.name}
                        </td>
                        <td>{account.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="card text-center">
          <h3>No accounts yet</h3>
          <p>Get started by creating your first account using the button above.</p>
        </div>
      )}
    </div>
  );
}
