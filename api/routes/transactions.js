const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const prisma = require('../db/client');
const { authenticate } = require('../middleware/auth');
const { authorizeClient, validateClientOwnership } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

router.use(authenticate);
router.use(authorizeClient);

/**
 * GET /api/transactions
 * List transactions for the user's client
 */
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, limit = 50, offset = 0 } = req.query;

    const where = { ...req.clientFilter };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: { code: true, name: true, type: true }
            }
          }
        }
      },
      orderBy: { date: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.transaction.count({ where });

    res.json({
      transactions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('List transactions error:', error);
    res.status(500).json({ error: 'Failed to list transactions' });
  }
});

/**
 * GET /api/transactions/:id
 * Get single transaction with entries
 */
router.get('/:id', [
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        ledgerEntries: {
          include: {
            account: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await validateClientOwnership(req, transaction);

    res.json({ transaction });
  } catch (error) {
    if (error.message === 'Access denied to this resource') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

/**
 * POST /api/transactions
 * Create new transaction with ledger entries
 */
router.post('/', [
  body('date').isISO8601(),
  body('description').trim().notEmpty(),
  body('reference').optional().trim(),
  body('entries').isArray({ min: 2 }),
  body('entries.*.accountId').isUUID(),
  body('entries.*.amount').isFloat({ min: 0.01 }),
  body('entries.*.type').isIn(['DEBIT', 'CREDIT']),
  validate
], async (req, res) => {
  try {
    const { date, description, reference, entries } = req.body;

    // Validate double-entry: debits must equal credits
    const debits = entries
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const credits = entries
      .filter(e => e.type === 'CREDIT')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    if (Math.abs(debits - credits) > 0.01) {
      return res.status(400).json({
        error: 'Transaction not balanced',
        details: { debits, credits }
      });
    }

    // Verify all accounts belong to client
    const accountIds = entries.map(e => e.accountId);
    const accounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        clientId: req.user.clientId
      }
    });

    if (accounts.length !== accountIds.length) {
      return res.status(400).json({ error: 'One or more accounts not found' });
    }

    // Create transaction and entries in a transaction
    const transaction = await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          date: new Date(date),
          description,
          reference,
          clientId: req.user.clientId,
          ledgerEntries: {
            create: entries.map(entry => ({
              accountId: entry.accountId,
              amount: entry.amount,
              type: entry.type
            }))
          }
        },
        include: {
          ledgerEntries: {
            include: {
              account: {
                select: { code: true, name: true, type: true }
              }
            }
          }
        }
      });
      return txn;
    });

    res.status(201).json({ transaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete transaction (cascade will delete ledger entries)
 */
router.delete('/:id', [
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await validateClientOwnership(req, transaction);

    // Hard delete (cascade will delete ledger entries)
    await prisma.transaction.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    if (error.message === 'Access denied to this resource') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;
