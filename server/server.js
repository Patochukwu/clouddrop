const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = require('./src/app.js');
const { runMigrations } = require('./src/db/migrations/migrate');

const PORT = process.env.PORT || 5000;

if (process.env.DATABASE_URL) {
  runMigrations()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 CloudDrop server running on port ${PORT} (Database Connected)`);
      });
    })
    .catch((err) => {
      console.warn('⚠️ Database migration failed. Falling back to S3-Only Mode:', err.message);
      delete process.env.DATABASE_URL;
      app.listen(PORT, () => {
        console.log(`🚀 CloudDrop server running on port ${PORT} (S3-Only Mode)`);
      });
    });
} else {
  console.log('💡 DATABASE_URL not set. Starting server in S3-Only Mode.');
  app.listen(PORT, () => {
    console.log(`🚀 CloudDrop server running on port ${PORT} (S3-Only Mode)`);
  });
}
