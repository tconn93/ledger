const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter for Prisma 7
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create demo client
  const demoClient = await prisma.client.create({
    data: {
      name: 'Demo Company Inc.',
      email: 'demo@example.com',
      phone: '555-0100',
      address: '123 Demo Street, Demo City, DC 12345'
    }
  });

  console.log('Created demo client:', demoClient.name);

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 10);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'User',
      clientId: demoClient.id
    }
  });

  console.log('Created demo user:', demoUser.email, '(password: password123)');

  // Create chart of accounts
  const accounts = [
    // Assets
    { code: '1000', name: 'Cash', type: 'ASSET', description: 'Cash on hand and in bank' },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET', description: 'Money owed by customers' },
    { code: '1200', name: 'Inventory', type: 'ASSET', description: 'Goods for sale' },
    { code: '1500', name: 'Equipment', type: 'ASSET', description: 'Office equipment and machinery' },

    // Liabilities
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', description: 'Money owed to suppliers' },
    { code: '2100', name: 'Loans Payable', type: 'LIABILITY', description: 'Bank loans and notes' },

    // Equity
    { code: '3000', name: "Owner's Equity", type: 'EQUITY', description: "Owner's investment" },
    { code: '3100', name: 'Retained Earnings', type: 'EQUITY', description: 'Accumulated profits' },

    // Revenue
    { code: '4000', name: 'Sales Revenue', type: 'REVENUE', description: 'Income from sales' },
    { code: '4100', name: 'Service Revenue', type: 'REVENUE', description: 'Income from services' },

    // Expenses
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', description: 'Direct costs of sales' },
    { code: '6000', name: 'Rent Expense', type: 'EXPENSE', description: 'Office rent' },
    { code: '6100', name: 'Utilities Expense', type: 'EXPENSE', description: 'Electricity, water, internet' },
    { code: '6200', name: 'Salaries Expense', type: 'EXPENSE', description: 'Employee salaries' },
    { code: '6300', name: 'Office Supplies', type: 'EXPENSE', description: 'Office supplies and materials' }
  ];

  for (const account of accounts) {
    await prisma.account.create({
      data: {
        ...account,
        clientId: demoClient.id
      }
    });
  }

  console.log(`Created ${accounts.length} accounts`);

  // Create sample transaction - Initial capital investment
  const cashAccount = await prisma.account.findFirst({
    where: { code: '1000', clientId: demoClient.id }
  });
  const equityAccount = await prisma.account.findFirst({
    where: { code: '3000', clientId: demoClient.id }
  });

  await prisma.transaction.create({
    data: {
      date: new Date('2025-01-01'),
      description: 'Initial capital investment',
      reference: 'INV-001',
      clientId: demoClient.id,
      ledgerEntries: {
        create: [
          {
            accountId: cashAccount.id,
            amount: 10000.00,
            type: 'DEBIT'
          },
          {
            accountId: equityAccount.id,
            amount: 10000.00,
            type: 'CREDIT'
          }
        ]
      }
    }
  });

  console.log('Created sample transaction: Initial capital investment');
  console.log('');
  console.log('Seeding completed!');
  console.log('');
  console.log('You can now log in with:');
  console.log('  Email: demo@example.com');
  console.log('  Password: password123');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
