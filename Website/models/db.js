const mysql = require('mysql2');
const config = require('../config');  // Import the config file to access database configuration

// Create a connection to the MySQL database using the config
const db = mysql.createConnection(config.db);

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

module.exports = db;  // Export the db connection for use in other files
