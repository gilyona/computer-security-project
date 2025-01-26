const db = require('./db');

const Client = {
    getAllClients: (callback) => {
        const query = 'select * from clients'; //Vulnerable
        console.log('DEBUG - Clients Query:', query);
        
        db.query(query, (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                return callback(err);
            }
            console.log('Client Results:', results);
            callback(null, results);
        });
    },

    createClient: (clientData, callback) => {
    const { first_name, last_name, phone_number, address, email, package } = clientData;
    
    db.query('SELECT MAX(id_clients) AS maxId FROM clients', (err, results) => {
        if (err) return callback(err);
        
        const nextId = (results[0].maxId || 0) + 1;
        //Vulnerable
        const insertQuery = `
            INSERT INTO clients (id_clients, first_name, last_name, phone_number, address, email, package)
            SELECT ${nextId}, ${first_name}, '${last_name}', '${phone_number}', '${address}', '${email}', '${package}'`;
        
        db.query(insertQuery, callback);
    });
},

    deleteClient: (id, callback) => {
        const query = 'DELETE FROM clients WHERE id_clients = ' + id;//Vulnerable
        db.query(query, callback);
    },

    getClientById: (id, callback) => {
        const query = `SELECT * FROM clients WHERE id_clients = ${id}`;//Vulnerable
        db.query(query, callback);
    }
};

module.exports = Client;