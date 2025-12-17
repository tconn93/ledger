const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const prisma = require('../db/client');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register a new user and client
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('clientName').trim().notEmpty(),
  validate
], async (req, res) => {
  try {
    const { email, password, firstName, lastName, clientName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create client and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: { name: clientName }
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          clientId: client.id
        }
      });

      return { user, client };
    });

    // Generate JWT token
    const token = generateToken({
      userId: result.user.id,
      clientId: result.user.clientId,
      email: result.user.email
    });

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        clientId: result.user.clientId,
        clientName: result.client.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate
], async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with client info
    const user = await prisma.user.findUnique({
      where: { email },
      include: { client: true }
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if client is active
    if (!user.client.active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      clientId: user.clientId,
      email: user.email
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        clientId: user.clientId,
        clientName: user.client.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { client: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        clientId: true,
        client: {
          select: { name: true, email: true, phone: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

module.exports = router;
