const pool = require('./config/db');

const addLocationFields = async () => {
    try {
        console.log('Adding latitude and longitude to properties table...');
        
        // Check if columns exist first to avoid errors
        const [columns] = await pool.query(`SHOW COLUMNS FROM properties LIKE 'latitude'`);
        if (columns.length === 0) {
            await pool.query(`ALTER TABLE properties ADD COLUMN latitude DECIMAL(10, 8)`);
            console.log('Added latitude column.');
        } else {
            console.log('Latitude column already exists.');
        }

        const [columnsLng] = await pool.query(`SHOW COLUMNS FROM properties LIKE 'longitude'`);
        if (columnsLng.length === 0) {
            await pool.query(`ALTER TABLE properties ADD COLUMN longitude DECIMAL(11, 8)`);
            console.log('Added longitude column.');
        } else {
            console.log('Longitude column already exists.');
        }
        
        console.log('Database alteration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error altering database:', err);
        process.exit(1);
    }
};

addLocationFields();
