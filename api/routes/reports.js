const express = require('express');
const { query } = require('express-validator');
const router = express.Router();
const prisma = require('../db/client');
const { authenticate } = require('../middleware/auth');
const { authorizeClient } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

router.use(authenticate);
router.use(authorizeClient);

/**
 * GET /api/reports/trial-balance
 * Generate trial balance report
 */
router.get('/trial-balance', [
  query('asOf').optional().isISO8601(),
  validate
], async (req, res) => {
  try {
    const asOf = req.query.asOf ? new Date(req.query.asOf) : new Date();

    // Get all accounts for the client
    const accounts = await prisma.account.findMany({
      where: {
        ...req.clientFilter,
        active: true
      },
      include: {
        ledgerEntries: {
          where: {
            transaction: {
              date: { lte: asOf }
            }
          }
        }
      },
      orderBy: [{ type: 'asc' }, { code: 'asc' }]
    });

    const balances = accounts.map(account => {
      let debitTotal = 0;
      let creditTotal = 0;

      account.ledgerEntries.forEach(entry => {
        const amount = parseFloat(entry.amount);
        if (entry.type === 'DEBIT') {
          debitTotal += amount;
        } else {
          creditTotal += amount;
        }
      });

      const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.type);
      const balance = isDebitNormal ? debitTotal - creditTotal : creditTotal - debitTotal;

      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debitBalance: balance > 0 && isDebitNormal ? balance.toFixed(2) : '0.00',
        creditBalance: balance > 0 && !isDebitNormal ? balance.toFixed(2) : '0.00'
      };
    });

    const totalDebits = balances.reduce((sum, b) => sum + parseFloat(b.debitBalance), 0);
    const totalCredits = balances.reduce((sum, b) => sum + parseFloat(b.creditBalance), 0);

    res.json({
      asOf: asOf.toISOString(),
      balances,
      totals: {
        debits: totalDebits.toFixed(2),
        credits: totalCredits.toFixed(2),
        balanced: Math.abs(totalDebits - totalCredits) < 0.01
      }
    });
  } catch (error) {
    console.error('Trial balance error:', error);
    res.status(500).json({ error: 'Failed to generate trial balance' });
  }
});

/**
 * GET /api/reports/income-statement
 * Generate income statement (P&L)
 */
router.get('/income-statement', [
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  validate
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const accounts = await prisma.account.findMany({
      where: {
        ...req.clientFilter,
        type: { in: ['REVENUE', 'EXPENSE'] },
        active: true
      },
      include: {
        ledgerEntries: {
          where: {
            transaction: {
              date: {
                gte: new Date(startDate),
                lte: new Date(endDate)
              }
            }
          }
        }
      },
      orderBy: [{ type: 'asc' }, { code: 'asc' }]
    });

    let totalRevenue = 0;
    let totalExpense = 0;

    const revenues = [];
    const expenses = [];

    accounts.forEach(account => {
      let balance = 0;
      account.ledgerEntries.forEach(entry => {
        const amount = parseFloat(entry.amount);
        balance += entry.type === 'CREDIT' ? amount : -amount;
      });

      const item = {
        accountId: account.id,
        code: account.code,
        name: account.name,
        amount: Math.abs(balance).toFixed(2)
      };

      if (account.type === 'REVENUE') {
        revenues.push(item);
        totalRevenue += Math.abs(balance);
      } else {
        expenses.push(item);
        totalExpense += Math.abs(balance);
      }
    });

    const netIncome = totalRevenue - totalExpense;

    res.json({
      period: { startDate, endDate },
      revenues,
      expenses,
      totals: {
        revenue: totalRevenue.toFixed(2),
        expense: totalExpense.toFixed(2),
        netIncome: netIncome.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Income statement error:', error);
    res.status(500).json({ error: 'Failed to generate income statement' });
  }
});

/**
 * GET /api/reports/balance-sheet
 * Generate balance sheet
 */
router.get('/balance-sheet', [
  query('asOf').optional().isISO8601(),
  validate
], async (req, res) => {
  try {
    const asOf = req.query.asOf ? new Date(req.query.asOf) : new Date();

    const accounts = await prisma.account.findMany({
      where: {
        ...req.clientFilter,
        type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
        active: true
      },
      include: {
        ledgerEntries: {
          where: {
            transaction: {
              date: { lte: asOf }
            }
          }
        }
      },
      orderBy: [{ type: 'asc' }, { code: 'asc' }]
    });

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    const assets = [];
    const liabilities = [];
    const equity = [];

    accounts.forEach(account => {
      let balance = 0;
      const isDebitNormal = account.type === 'ASSET';

      account.ledgerEntries.forEach(entry => {
        const amount = parseFloat(entry.amount);
        if (entry.type === 'DEBIT') {
          balance += isDebitNormal ? amount : -amount;
        } else {
          balance += isDebitNormal ? -amount : amount;
        }
      });

      const item = {
        accountId: account.id,
        code: account.code,
        name: account.name,
        amount: balance.toFixed(2)
      };

      if (account.type === 'ASSET') {
        assets.push(item);
        totalAssets += balance;
      } else if (account.type === 'LIABILITY') {
        liabilities.push(item);
        totalLiabilities += balance;
      } else {
        equity.push(item);
        totalEquity += balance;
      }
    });

    res.json({
      asOf: asOf.toISOString(),
      assets,
      liabilities,
      equity,
      totals: {
        assets: totalAssets.toFixed(2),
        liabilities: totalLiabilities.toFixed(2),
        equity: totalEquity.toFixed(2),
        liabilitiesAndEquity: (totalLiabilities + totalEquity).toFixed(2),
        balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
      }
    });
  } catch (error) {
    console.error('Balance sheet error:', error);
    res.status(500).json({ error: 'Failed to generate balance sheet' });
  }
});

module.exports = router;
