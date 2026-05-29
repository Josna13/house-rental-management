const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDb() {
    try {
        console.log('Connecting to MySQL server...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        console.log('Altering properties table status enum...');
        await connection.query(`ALTER TABLE properties MODIFY COLUMN status ENUM('available', 'locked', 'booked') DEFAULT 'available';`);

        console.log('Creating notifications table if not exists...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                message TEXT NOT NULL,
                type ENUM('booking_update', 'new_property', 'system') DEFAULT 'system',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('Database updated successfully!');
        await connection.end();
    } catch (error) {
        console.error('Error updating database:', error);
        process.exit(1);
    }
}

updateDb();
