const fs = require('fs');
const path = require('path');
const pool = require('../pool');

async function runMigrations() {
  const sql = fs.readFileSync(
    path.join(__dirname, '001_create_files.sql'),
    'utf8'
  );
  try {
    await pool.query(sql);
    console.log('✅ Database migration check/apply successful');
  } catch (err) {
    console.error('❌ Database migration failed:', err.message);
    throw err;
  }
}

if (require.main === module) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
  runMigrations()
    .then(() => pool.end())
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };
