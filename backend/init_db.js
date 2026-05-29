const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDb() {
    try {
        console.log('Connecting to MySQL server...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        console.log('Creating database if not exists...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
        await connection.query(`USE \`${process.env.DB_NAME}\`;`);

        console.log('Creating users table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('Owner', 'User') NOT NULL,
                phone VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating properties table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS properties (
                id INT AUTO_INCREMENT PRIMARY KEY,
                owner_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                rent DECIMAL(10, 2) NOT NULL,
                deposit DECIMAL(10, 2) NOT NULL,
                location VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                property_purpose ENUM('Rent', 'Sale') DEFAULT 'Rent',
                status ENUM('available', 'locked', 'booked') DEFAULT 'available',
                images JSON,
                compatibility_metadata JSON,
                listed_by ENUM('Owner', 'Broker') DEFAULT 'Owner',
                brokerage_charge DECIMAL(10, 2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('Creating bookings table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                property_id INT NOT NULL,
                user_id INT NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('Creating favourites table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS favourites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                property_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
                UNIQUE KEY unique_favourite (user_id, property_id)
            )
        `);

        console.log('Creating notifications table...');
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

        console.log('Creating interactions table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS interactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                property_id INT,
                action_type ENUM('view', 'search', 'favorite', 'book') NOT NULL,
                metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
            )
        `);

        console.log('Creating reviews table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                property_id INT NOT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
            )
        `);

        console.log('Database and tables initialized successfully!');
        await connection.end();
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initDb();
