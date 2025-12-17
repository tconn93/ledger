import { useState } from 'react';
import { reportsAPI } from '../services/api';

export default function Reports() {
  const [activeReport, setActiveReport] = useState('trial-balance');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateParams, setDateParams] = useState({
    asOf: new Date().toISOString().split('T')[0],
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const loadReport = async (reportType) => {
    setLoading(true);
    setError('');
    setReportData(null);

    try {
      let response;
      switch (reportType) {
        case 'trial-balance':
          response = await reportsAPI.trialBalance({ asOf: dateParams.asOf });
          break;
        case 'income-statement':
          response = await reportsAPI.incomeStatement({
            startDate: dateParams.startDate,
            endDate: dateParams.endDate
          });
          break;
        case 'balance-sheet':
          response = await reportsAPI.balanceSheet({ asOf: dateParams.asOf });
          break;
      }
      setReportData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const renderTrialBalance = () => (
    <div className="card">
      <h2>Trial Balance</h2>
      <p className="mb-lg">As of: {new Date(reportData.asOf).toLocaleDateString()}</p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Account</th>
              <th>Type</th>
              <th className="text-right">Debit</th>
              <th className="text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {reportData.balances.map(balance => (
              <tr key={balance.accountId}>
                <td style={{ fontWeight: 500 }}>{balance.code}</td>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{balance.name}</td>
                <td>
                  <span className={`badge badge-${balance.type.toLowerCase()}`}>
                    {balance.type}
                  </span>
                </td>
                <td className="text-right" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {parseFloat(balance.debitBalance) > 0 ? `$${balance.debitBalance}` : '—'}
                </td>
                <td className="text-right" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {parseFloat(balance.creditBalance) > 0 ? `$${balance.creditBalance}` : '—'}
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'var(--gray-50)' }}>
              <td colSpan="3" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>TOTALS</td>
              <td className="text-right" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                ${reportData.totals.debits}
              </td>
              <td className="text-right" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                ${reportData.totals.credits}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={`alert ${reportData.totals.balanced ? 'alert-success' : 'alert-error'} mt-lg`}>
        {reportData.totals.balanced ? '✓ Trial Balance is balanced' : '✗ Trial Balance is not balanced'}
      </div>
    </div>
  );

  const renderIncomeStatement = () => (
    <div className="card">
      <h2>Income Statement (Profit & Loss)</h2>
      <p className="mb-xl">
        Period: {new Date(reportData.period.startDate).toLocaleDateString()} to {new Date(reportData.period.endDate).toLocaleDateString()}
      </p>

      <div className="mb-xl">
        <h3 className="mb-md">Revenue</h3>
        <div className="table-wrapper">
          <table>
            <tbody>
              {reportData.revenues.map(item => (
                <tr key={item.accountId}>
                  <td>{item.code} - {item.name}</td>
                  <td className="text-right" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    ${item.amount}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'var(--gray-50)' }}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Revenue</td>
                <td className="text-right" style={{ fontWeight: 700, color: 'var(--success-color)' }}>
                  ${reportData.totals.revenue}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-xl">
        <h3 className="mb-md">Expenses</h3>
        <div className="table-wrapper">
          <table>
            <tbody>
              {reportData.expenses.map(item => (
                <tr key={item.accountId}>
                  <td>{item.code} - {item.name}</td>
                  <td className="text-right" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    ${item.amount}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'var(--gray-50)' }}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Expenses</td>
                <td className="text-right" style={{ fontWeight: 700, color: 'var(--danger-color)' }}>
                  ${reportData.totals.expense}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <tbody>
            <tr style={{
              backgroundColor: parseFloat(reportData.totals.netIncome) >= 0 ? 'var(--success-light)' : 'var(--danger-light)',
              borderTop: '3px solid var(--text-primary)'
            }}>
              <td style={{ fontWeight: 700, fontSize: '1.125rem', padding: '1rem', color: 'var(--text-primary)' }}>
                Net Income
              </td>
              <td className="text-right" style={{
                fontWeight: 700,
                fontSize: '1.125rem',
                padding: '1rem',
                color: parseFloat(reportData.totals.netIncome) >= 0 ? 'var(--success-color)' : 'var(--danger-color)'
              }}>
                ${reportData.totals.netIncome}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBalanceSheet = () => (
    <div className="card">
      <h2>Balance Sheet</h2>
      <p className="mb-xl">As of: {new Date(reportData.asOf).toLocaleDateString()}</p>

      <div className="mb-xl">
        <h3 className="mb-md">Assets</h3>
        <div className="table-wrapper">
          <table>
            <tbody>
              {reportData.assets.map(item => (
                <tr key={item.accountId}>
                  <td>{item.code} - {item.name}</td>
                  <td className="text-right" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    ${item.amount}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'var(--gray-50)' }}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Assets</td>
                <td className="text-right" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  ${reportData.totals.assets}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-xl">
        <h3 className="mb-md">Liabilities</h3>
        <div className="table-wrapper">
          <table>
            <tbody>
              {reportData.liabilities.map(item => (
                <tr key={item.accountId}>
                  <td>{item.code} - {item.name}</td>
                  <td className="text-right" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    ${item.amount}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'var(--gray-50)' }}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Liabilities</td>
                <td className="text-right" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  ${reportData.totals.liabilities}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-xl">
        <h3 className="mb-md">Equity</h3>
        <div className="table-wrapper">
          <table>
            <tbody>
              {reportData.equity.map(item => (
                <tr key={item.accountId}>
                  <td>{item.code} - {item.name}</td>
                  <td className="text-right" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    ${item.amount}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'var(--gray-50)' }}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Equity</td>
                <td className="text-right" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  ${reportData.totals.equity}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <tbody>
            <tr style={{ backgroundColor: 'var(--gray-50)', borderTop: '3px solid var(--text-primary)' }}>
              <td style={{ fontWeight: 700, fontSize: '1.125rem', padding: '1rem', color: 'var(--text-primary)' }}>
                Total Liabilities & Equity
              </td>
              <td className="text-right" style={{ fontWeight: 700, fontSize: '1.125rem', padding: '1rem', color: 'var(--text-primary)' }}>
                ${reportData.totals.liabilitiesAndEquity}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={`alert ${reportData.totals.balanced ? 'alert-success' : 'alert-error'} mt-lg`}>
        {reportData.totals.balanced ?
          '✓ Balance Sheet is balanced (Assets = Liabilities + Equity)' :
          '✗ Balance Sheet is not balanced'}
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="mb-xl">Financial Reports</h1>

      <div className="flex gap-md mb-xl">
        <button
          onClick={() => setActiveReport('trial-balance')}
          className={`btn ${activeReport === 'trial-balance' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Trial Balance
        </button>
        <button
          onClick={() => setActiveReport('income-statement')}
          className={`btn ${activeReport === 'income-statement' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Income Statement
        </button>
        <button
          onClick={() => setActiveReport('balance-sheet')}
          className={`btn ${activeReport === 'balance-sheet' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Balance Sheet
        </button>
      </div>

      {activeReport === 'trial-balance' && (
        <div className="card mb-xl">
          <h3 className="mb-md">Report Parameters</h3>
          <div className="flex gap-md" style={{ alignItems: 'flex-end' }}>
            <div className="form-group mb-0" style={{ flex: 1 }}>
              <label className="form-label">As of Date</label>
              <input
                type="date"
                className="form-input"
                value={dateParams.asOf}
                onChange={(e) => setDateParams({ ...dateParams, asOf: e.target.value })}
              />
            </div>
            <button
              onClick={() => loadReport('trial-balance')}
              className="btn btn-success"
            >
              Generate Report
            </button>
          </div>
        </div>
      )}

      {activeReport === 'income-statement' && (
        <div className="card mb-xl">
          <h3 className="mb-md">Report Parameters</h3>
          <div className="flex gap-md" style={{ alignItems: 'flex-end' }}>
            <div className="form-group mb-0" style={{ flex: 1 }}>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={dateParams.startDate}
                onChange={(e) => setDateParams({ ...dateParams, startDate: e.target.value })}
              />
            </div>
            <div className="form-group mb-0" style={{ flex: 1 }}>
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={dateParams.endDate}
                onChange={(e) => setDateParams({ ...dateParams, endDate: e.target.value })}
              />
            </div>
            <button
              onClick={() => loadReport('income-statement')}
              className="btn btn-success"
            >
              Generate Report
            </button>
          </div>
        </div>
      )}

      {activeReport === 'balance-sheet' && (
        <div className="card mb-xl">
          <h3 className="mb-md">Report Parameters</h3>
          <div className="flex gap-md" style={{ alignItems: 'flex-end' }}>
            <div className="form-group mb-0" style={{ flex: 1 }}>
              <label className="form-label">As of Date</label>
              <input
                type="date"
                className="form-input"
                value={dateParams.asOf}
                onChange={(e) => setDateParams({ ...dateParams, asOf: e.target.value })}
              />
            </div>
            <button
              onClick={() => loadReport('balance-sheet')}
              className="btn btn-success"
            >
              Generate Report
            </button>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <div className="loading">Generating report...</div>}

      {reportData && !loading && (
        <div>
          {activeReport === 'trial-balance' && renderTrialBalance()}
          {activeReport === 'income-statement' && renderIncomeStatement()}
          {activeReport === 'balance-sheet' && renderBalanceSheet()}
        </div>
      )}

      {!reportData && !loading && (
        <div className="card text-center">
          <h3>No report generated yet</h3>
          <p>Select your parameters above and click "Generate Report" to view financial data.</p>
        </div>
      )}
    </div>
  );
}
