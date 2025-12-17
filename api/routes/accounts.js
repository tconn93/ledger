const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const prisma = require('../db/client');
const { authenticate } = require('../middleware/auth');
const { authorizeClient, validateClientOwnership } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// All routes require authentication and authorization
router.use(authenticate);
router.use(authorizeClient);

/**
 * GET /api/accounts
 * List all accounts for the user's client
 */
router.get('/', async (req, res) => {
  try {
    const { type, active } = req.query;

    const where = { ...req.clientFilter };
    if (type) where.type = type;
    if (active !== undefined) where.active = active === 'true';

    const accounts = await prisma.account.findMany({
      where,
      orderBy: [{ code: 'asc' }]
    });

    res.json({ accounts });
  } catch (error) {
    console.error('List accounts error:', error);
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

/**
 * GET /api/accounts/:id
 * Get single account details
 */
router.get('/:id', [
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.id }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await validateClientOwnership(req, account);

    res.json({ account });
  } catch (error) {
    if (error.message === 'Access denied to this resource') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Failed to get account' });
  }
});

/**
 * POST /api/accounts
 * Create new account
 */
router.post('/', [
  body('code').trim().notEmpty(),
  body('name').trim().notEmpty(),
  body('type').isIn(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  body('description').optional().trim(),
  validate
], async (req, res) => {
  try {
    const { code, name, type, description } = req.body;

    // Check for duplicate code within client
    const existing = await prisma.account.findUnique({
      where: {
        clientId_code: {
          clientId: req.user.clientId,
          code
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Account code already exists' });
    }

    const account = await prisma.account.create({
      data: {
        code,
        name,
        type,
        description,
        clientId: req.user.clientId
      }
    });

    res.status(201).json({ account });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * PUT /api/accounts/:id
 * Update account
 */
router.put('/:id', [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('active').optional().isBoolean(),
  validate
], async (req, res) => {
  try {
    // Verify ownership
    const existing = await prisma.account.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await validateClientOwnership(req, existing);

    const { name, description, active } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (active !== undefined) updateData.active = active;

    const account = await prisma.account.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ account });
  } catch (error) {
    if (error.message === 'Access denied to this resource') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

/**
 * GET /api/accounts/:id/balance
 * Get account balance
 */
router.get('/:id/balance', [
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.id }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await validateClientOwnership(req, account);

    // Calculate balance based on account type and debits/credits
    const entries = await prisma.ledgerEntry.findMany({
      where: { accountId: req.params.id },
      select: { amount: true, type: true }
    });

    let balance = 0;
    const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.type);

    entries.forEach(entry => {
      const amount = parseFloat(entry.amount);
      if (entry.type === 'DEBIT') {
        balance += isDebitNormal ? amount : -amount;
      } else {
        balance += isDebitNormal ? -amount : amount;
      }
    });

    res.json({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      balance: balance.toFixed(2)
    });
  } catch (error) {
    if (error.message === 'Access denied to this resource') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

module.exports = router;
