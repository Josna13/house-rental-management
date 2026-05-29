const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterDb() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Adding property_purpose column...');
        await connection.query(`ALTER TABLE properties ADD COLUMN property_purpose ENUM('Rent', 'Sale') DEFAULT 'Rent' AFTER type`);
        
        console.log('Database altered successfully!');
        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}
alterDb();
