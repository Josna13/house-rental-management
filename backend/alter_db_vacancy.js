const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterDbVacancy() {
    try {
        console.log('Connecting to MySQL server...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Adding vacancy columns to properties table...');
        
        // Add vacancy_count
        try {
            await connection.query(`ALTER TABLE properties ADD COLUMN vacancy_count INT NOT NULL DEFAULT 1;`);
            console.log('Added vacancy_count column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('vacancy_count already exists.');
            else throw e;
        }

        // Add vacancy_for
        try {
            await connection.query(`ALTER TABLE properties ADD COLUMN vacancy_for ENUM('Boys', 'Girls', 'Anyone') NOT NULL DEFAULT 'Anyone';`);
            console.log('Added vacancy_for column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('vacancy_for already exists.');
            else throw e;
        }

        // Add availability_type
        try {
            await connection.query(`ALTER TABLE properties ADD COLUMN availability_type ENUM('Available Now', 'Available Soon') NOT NULL DEFAULT 'Available Now';`);
            console.log('Added availability_type column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('availability_type already exists.');
            else throw e;
        }

        // Add available_from_date
        try {
            await connection.query(`ALTER TABLE properties ADD COLUMN available_from_date DATE NULL;`);
            console.log('Added available_from_date column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('available_from_date already exists.');
            else throw e;
        }

        console.log('Vacancy columns added successfully!');
        await connection.end();
    } catch (error) {
        console.error('Error altering database:', error);
        process.exit(1);
    }
}

alterDbVacancy();
