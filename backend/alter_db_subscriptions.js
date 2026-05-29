const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterDbSubscriptions() {
    try {
        console.log('Connecting to MySQL server...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Creating subscriptions table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                location VARCHAR(255),
                property_type VARCHAR(50),
                gender_preference ENUM('Boys', 'Girls', 'Anyone'),
                max_budget DECIMAL(10, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('Subscriptions table created successfully!');
        await connection.end();
    } catch (error) {
        console.error('Error altering database:', error);
        process.exit(1);
    }
}

alterDbSubscriptions();
