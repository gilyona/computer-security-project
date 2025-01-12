const db = require('./db'); // Import the database connection

const Client = {
    // Fetch all clients
    getAllClients: (callback) => {
        const query = 'SELECT * FROM clients';
        console.log('Executing query:', query); // Add this
        db.query(query, (err, results) => {
            if (err) {
                console.error('Error executing query:', err); // Add this
            } else {
                console.log('Query results:', results); // Add this
            }
            callback(err, results);
        });
    },
    
    

    // Add a new client
    createClient: (clientData, callback) => {
        const { first_name, last_name, phone_number, address, email, package } = clientData;
        const query = `
        INSERT INTO clients (first_name, last_name, phone_number, address, email, package)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
        db.query(query, [first_name, last_name, phone_number, address, email, package], callback);
    },

    // Delete a client by ID
    deleteClient: (id, callback) => {
        const query = 'DELETE FROM clients WHERE id_clients = ?';
        db.query(query, [id], callback);
    },
};

module.exports = Client;
