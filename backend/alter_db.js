const pool = require('./config/db');

async function addBrokerFields() {
    try {
        console.log("Adding listed_by column...");
        await pool.query("ALTER TABLE properties ADD COLUMN listed_by ENUM('Owner', 'Broker') DEFAULT 'Owner'");
    } catch(e) { console.log("Column listed_by might exist: ", e.message); }
    
    try {
        console.log("Adding brokerage_charge column...");
        await pool.query("ALTER TABLE properties ADD COLUMN brokerage_charge DECIMAL(10,2) DEFAULT 0.00");
    } catch(e) { console.log("Column brokerage_charge might exist: ", e.message); }
    
    try {
        console.log("Adding property_purpose column...");
        await pool.query("ALTER TABLE properties ADD COLUMN property_purpose ENUM('Rent', 'Sale') DEFAULT 'Rent'");
    } catch(e) { console.log("Column property_purpose might exist: ", e.message); }
    
    console.log("Done.");
    process.exit(0);
}
addBrokerFields();
