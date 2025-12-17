import { useState, useEffect } from 'react';
import { transactionsAPI, accountsAPI } from '../services/api';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    entries: [
      { accountId: '', amount: '', type: 'DEBIT' },
      { accountId: '', amount: '', type: 'CREDIT' }
    ]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txnResponse, accResponse] = await Promise.all([
        transactionsAPI.list(),
        accountsAPI.list()
      ]);
      setTransactions(txnResponse.data.transactions);
      setAccounts(accResponse.data.accounts);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addEntry = () => {
    setFormData({
      ...formData,
      entries: [...formData.entries, { accountId: '', amount: '', type: 'DEBIT' }]
    });
  };

  const updateEntry = (index, field, value) => {
    const newEntries = [...formData.entries];
    newEntries[index][field] = value;
    setFormData({ ...formData, entries: newEntries });
  };

  const removeEntry = (index) => {
    if (formData.entries.length > 2) {
      const newEntries = formData.entries.filter((_, i) => i !== index);
      setFormData({ ...formData, entries: newEntries });
    }
  };

  const calculateBalance = () => {
    const debits = formData.entries
      .filter(e => e.type === 'DEBIT' && e.amount)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const credits = formData.entries
      .filter(e => e.type === 'CREDIT' && e.amount)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    return { debits, credits, balanced: Math.abs(debits - credits) < 0.01 };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const balance = calculateBalance();

    if (!balance.balanced) {
      setError('Transaction not balanced! Debits must equal credits.');
      return;
    }

    try {
      await transactionsAPI.create(formData);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        entries: [
          { accountId: '', amount: '', type: 'DEBIT' },
          { accountId: '', amount: '', type: 'CREDIT' }
        ]
      });
      setShowForm(false);
      setError('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create transaction');
    }
  };

  if (loading) return <div className="loading">Loading transactions...</div>;

  const balance = calculateBalance();

  return (
    <div>
      <div className="card-header">
        <h1 className="card-title">Transactions</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`}
        >
          {showForm ? 'Cancel' : '+ New Transaction'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card mb-xl">
          <h3>Create Transaction</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Office supplies purchase"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reference (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="e.g., Invoice #1234"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Journal Entries</label>
              {formData.entries.map((entry, index) => (
                <div key={index} className="flex gap-sm mb-sm" style={{ alignItems: 'flex-start' }}>
                  <select
                    className="form-select"
                    style={{ flex: '2' }}
                    value={entry.accountId}
                    onChange={(e) => updateEntry(index, 'accountId', e.target.value)}
                    required
                  >
                    <option value="">Select Account</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    className="form-input"
                    style={{ flex: '1' }}
                    step="0.01"
                    min="0.01"
                    value={entry.amount}
                    onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                    placeholder="Amount"
                    required
                  />

                  <select
                    className="form-select"
                    style={{ flex: '1' }}
                    value={entry.type}
                    onChange={(e) => updateEntry(index, 'type', e.target.value)}
                  >
                    <option value="DEBIT">Debit</option>
                    <option value="CREDIT">Credit</option>
                  </select>

                  {formData.entries.length > 2 && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeEntry(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                className="btn btn-secondary"
                onClick={addEntry}
              >
                + Add Entry
              </button>
            </div>

            <div className={`alert ${balance.balanced ? 'alert-success' : 'alert-warning'}`}>
              <strong>Balance Check:</strong><br />
              Debits: ${balance.debits.toFixed(2)} | Credits: ${balance.credits.toFixed(2)}<br />
              {balance.balanced ? '✓ Transaction is balanced' : '✗ Transaction must be balanced (debits = credits)'}
            </div>

            <button
              type="submit"
              className="btn btn-success"
              disabled={!balance.balanced}
            >
              Create Transaction
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-center">No transactions yet. Create your first transaction above!</p>
        ) : (
          <div>
            {transactions.map(txn => (
              <div key={txn.id} className="card mb-lg">
                <div className="flex-between mb-md">
                  <div>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {new Date(txn.date).toLocaleDateString()}
                    </strong>
                    <span style={{ marginLeft: '1rem', color: 'var(--text-secondary)' }}>
                      {txn.description}
                    </span>
                  </div>
                  {txn.reference && (
                    <span className="badge badge-asset">
                      {txn.reference}
                    </span>
                  )}
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th className="text-right">Debit</th>
                        <th className="text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txn.ledgerEntries.map(entry => (
                        <tr key={entry.id}>
                          <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {entry.account.code} - {entry.account.name}
                          </td>
                          <td className="text-right">
                            {entry.type === 'DEBIT' ? (
                              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                ${parseFloat(entry.amount).toFixed(2)}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="text-right">
                            {entry.type === 'CREDIT' ? (
                              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                ${parseFloat(entry.amount).toFixed(2)}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
