require('dotenv').config();
const pool = require('./config/db');

async function migrate() {
    try {
        await pool.query('ALTER TABLE properties ADD COLUMN compatibility_metadata JSON');
        console.log('Migration successful: Added compatibility_metadata to properties');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Migration skipped: Column already exists');
        } else {
            console.error('Migration failed:', err);
        }
    } finally {
        process.exit(0);
    }
}
migrate();
