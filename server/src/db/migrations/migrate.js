require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const fs = require('fs');
const path = require('path');
const pool = require('../pool');

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, '001_create_files.sql'),
    'utf8'
  );
  try {
    await pool.query(sql);
    console.log('✅ Migration applied successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
