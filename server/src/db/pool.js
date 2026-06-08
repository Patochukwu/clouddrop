const { Pool } = require('pg');

// Use the DATABASE_URL environment variable if provided, otherwise default to the local Docker Postgres setup
const defaultDbUrl = 'postgresql://postgres:password@localhost:5433/clouddrop';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || defaultDbUrl,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err.message);
});

module.exports = pool;
