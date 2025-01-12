const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Ensure this is installed
const User = require('./models/users');
const Client = require('./models/clients');
const passwordConfig = require('./passwordConfig'); // Import password configuration

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json()); // To parse incoming JSON requests

// Serve static files (like HTML, CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Create a connection to the MySQL database
const db = require('./models/db'); // This imports the db connection

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Function to validate password complexity
const validatePassword = (password, confirmPassword) => {
  const { minLength, maxLength, complexity, checkDictionary } = passwordConfig;

  if (password !== confirmPassword) {
    return 'Password and confirm password do not match.';
  }
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters long.`;
  }
  if (password.length > maxLength) {
    return `Password must be no more than ${maxLength} characters long.`;
  }

  if (complexity.upperCase && !/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (complexity.lowerCase && !/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (complexity.digits && !/\d/.test(password)) {
    return 'Password must contain at least one digit.';
  }
  if (complexity.specialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character.';
  }

  if (checkDictionary && containsDictionaryWord(password)) {
    return 'Password cannot contain dictionary words.';
  }

  return null; // Return null if password is valid
};

// Function to check if the password contains dictionary words
const words = require('english-words');

const containsDictionaryWord = (password) => {
  const lowerCasePassword = password.toLowerCase();
  for (let word of Array.from(words)) {
    if (lowerCasePassword.includes(word)) {
      return true;
    }
  }
  return false;
};

// Helper function to check if an account is locked
const isAccountLocked = (lockedUntil) => {
  if (!lockedUntil) return false; // Account is not locked
  const currentTime = new Date();
  return new Date(lockedUntil) > currentTime; // Account is locked if current time is before locked_until
};

// User registration route
app.post('/register', (req, res) => {
  const { email, password, confirmPassword } = req.body;

  const validationError = validatePassword(password, confirmPassword);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  User.findUserByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });

    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return res.status(500).json({ message: 'Error hashing password' });

      User.createUser(email, hashedPassword, (err) => {
        if (err) return res.status(500).json({ message: 'Error saving user' });
        res.status(200).json({ message: 'User registered successfully' });
      });
    });
  });
});

// Login route
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  User.findUserByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = results[0];

    if (isAccountLocked(user.locked_until)) {
      return res.status(400).json({ message: 'Account is locked. Please try again later.' });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).json({ message: 'Error comparing password' });

      if (isMatch) {
        User.resetLoginAttempts(user.id, (err) => {
          if (err) return res.status(500).json({ message: 'Error resetting login attempts' });

          const token = jwt.sign({ id: user.id }, 'your_secret_key', { expiresIn: '1h' });
          return res.status(200).json({
            message: 'Login successful',
            token: token,
            email: user.email, // Send email in response
          });
        });
      } else {
        User.incrementLoginAttempts(user.id, user.login_attempts + 1, (err) => {
          if (err) return res.status(500).json({ message: 'Error incrementing login attempts' });

          if (user.login_attempts + 1 >= 3) {
            const lockTime = new Date();
            lockTime.setMinutes(lockTime.getMinutes() + 10); // Lock for 10 minutes
            User.lockAccount(user.id, lockTime, (err) => {
              if (err) return res.status(500).json({ message: 'Error locking account' });
            });
          }

          return res.status(400).json({ message: 'Invalid email or password' });
        });
      }
    });
  });
});

// Start the server on port 3000
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});

// Fetch all clients
app.get('/api/clients', (req, res) => {
  console.log('Received request to fetch clients');
  Client.getAllClients((err, results) => {
      if (err) {
          console.error('Error fetching clients:', err);
          return res.status(500).json({ message: 'Database error' });
      }
      console.log('Fetched clients:', results);
      res.status(200).json(results);
  });
});



// Add a new client
app.post('/api/clients', (req, res) => {
  const { first_name, last_name, phone_number, email, address, package } = req.body;

  // Validate required fields
  if (!first_name || !last_name || !phone_number || !email) {
      return res.status(400).json({ message: 'Missing required fields' });
  }

  const clientData = { first_name, last_name, phone_number, address, email, package };
  Client.createClient(clientData, (err, results) => {
      if (err) {
          console.error('Error adding client:', err);
          return res.status(500).json({ message: 'Database error' });
      }
      res.status(201).json({ message: 'Client added successfully', id_clients: results.insertId });
  });
});


// Delete a client
// Delete a client
app.delete('/api/clients/:id_clients', (req, res) => {
  const clientId = req.params.id_clients;

  // Fetch the client details before deleting
  Client.getClientById(clientId, (err, results) => {
    if (err) {
      console.error('Error fetching client details:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const client = results[0];

    // Proceed with deletion
    Client.deleteClient(clientId, (err, results) => {
      if (err) {
        console.error('Error deleting client:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.status(200).json({
        message: 'Client deleted successfully',
        first_name: client.first_name,
      });
    });
  });
});


