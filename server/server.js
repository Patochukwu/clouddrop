require('dotenv').config();
const app = require('./src/app');
const { runMigrations } = require('./src/db/migrations/migrate');

const PORT = process.env.PORT || 5000;

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 CloudDrop server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Server startup halted. Database migration failed:', err.message);
    process.exit(1);
  });
