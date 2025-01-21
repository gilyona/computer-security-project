// users.js
const bcrypt = require('bcryptjs');
const db = require('./db');  // Import the MySQL connection pool

const User = {
  // Dumb and vulnerable method to create a new user
  createUser: (email, hashedPassword, callback) => {
    // Store the hashed password in password_history
    const passwordHistory = JSON.stringify([hashedPassword]);
    
    const query = `INSERT INTO users (email, password, password_history) 
                   VALUES ('${email}', '${hashedPassword}', '${passwordHistory}')`;
    
    console.log('DEBUG - Registration Query:', query);
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('DEBUG - Error:', err);
            return callback(err);
        }
        callback(null, {
            message: `User created successfully! Welcome, ${email}!`,
            results: results,
        });
    });
},

// Vulnerable version of findUserByEmail
findUserByEmail: (email, callback) => {
  // UNSAFE: Direct string concatenation (for educational purposes)
  const query = `SELECT * FROM users WHERE email = '${email}'`;
  console.log('DEBUG - Query:', query);
  
  db.query(query, (err, results) => {
      if (err) {
          console.error('DEBUG - Error:', err);
          return callback(err);
      }
      console.log('DEBUG - Results:', results);
      callback(null, results);
  });
},

  // Method to update the user's password and manage the password history
  updatePasswordHistory: (userId, newPassword, callback) => {
    // Retrieve the last 3 passwords
    db.query('SELECT password_history FROM users WHERE id = ?', [userId], (err, results) => {
      if (err) return callback(err);

      // Check if user exists
      if (results.length === 0) {
        return callback(new Error('User not found'));
      }

      const passwordHistory = results[0].password_history ? JSON.parse(results[0].password_history) : [];

      // Check if the new password is in the history
      if (passwordHistory.includes(newPassword)) {
        return callback(new Error('New password cannot be the same as a previous password.'));
      }

      // Hash the new password and update the history
      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) return callback(err);

        passwordHistory.unshift(hashedPassword);  // Add new password to the history
        if (passwordHistory.length > 3) {
          passwordHistory.pop();  // Remove the oldest password if there are more than 3
        }

        // Update the user password and password history
        const historyString = JSON.stringify(passwordHistory);
        db.query('UPDATE users SET password = ?, password_history = ? WHERE id = ?', 
          [hashedPassword, historyString, userId], (err, results) => {
            if (err) return callback(err);
            callback(null, 'Password updated successfully');
          });
      });
    });
  },
   // Increment login attempts
   incrementLoginAttempts: (userId, attempts, callback) => {
    const query = 'UPDATE users SET login_attempts = ? WHERE id = ?';
    db.query(query, [attempts, userId], (err, results) => {
      if (err) return callback(err);
      callback(null, results);
    });
  },

  // Reset login attempts after successful login
  resetLoginAttempts: (userId, callback) => {
    const query = 'UPDATE users SET login_attempts = 0 WHERE id = ?';
    db.query(query, [userId], (err, results) => {
      if (err) return callback(err);
      callback(null, results);
    });
  },

  // Lock the account by setting locked_until
  lockAccount: (userId, lockTime, callback) => {
    const query = 'UPDATE users SET locked_until = ? WHERE id = ?';
    db.query(query, [lockTime, userId], (err, results) => {
      if (err) return callback(err);
      callback(null, results);
    });
  },
    isAccountLocked : (lockedUntil) => {
    if (!lockedUntil) return false; // Account is not locked
    const currentTime = new Date();
    return new Date(lockedUntil) > currentTime; // Account is locked if current time is before locked_until
  },

};

module.exports = User; // Export the User model to use in other files