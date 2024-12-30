const express = require('express');
const cors = require('cors');
const path = require('path');  // To serve static iiles
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Make sure this is installed
const User = require('./models/users');  
const passwordConfig = require('./passwordConfig');  // Import the password configuration

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());  // To parse incoming JSON requests

// Serve static files (like HTML, CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Create a connection to the MySQL database
const db = require('./models/db');  // This imports the db connection

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Function to validate password complexity
const validatePassword = (password) => {
  const { minLength, maxLength, complexity, checkDictionary } = passwordConfig;

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

  return null;  // Return null if password is valid
};

// Function to check if the password contains dictionary words
const words = require('english-words');

// Convert Set to Array for iteration
const containsDictionaryWord = (password) => {
  const lowerCasePassword = password.toLowerCase();
  
  // Convert the Set to an array and loop through
  for (let word of Array.from(words)) {
    if (lowerCasePassword.includes(word)) {
      return true;  // Return true if dictionary word is found
    }
  }
  return false;  // No dictionary word found
};

// Helper function to check if an account is locked
// Check if the account is locked by comparing `locked_until`
const isAccountLocked = (lockedUntil) => {
  if (!lockedUntil) return false; // Account is not locked
  const currentTime = new Date();
  return new Date(lockedUntil) > currentTime; // Account is locked if current time is before locked_until
}


// User registration route
app.post('/register', (req, res) => {
  const { email, password } = req.body;

  // Validate password complexity and length
  const validationError = validatePassword(password);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  // Check if the email already exists
  User.findUserByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    
    // Check if the results array is empty or contains a user
    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return res.status(500).json({ message: 'Error hashing password' });

      // Create the user
      User.createUser(email, hashedPassword, (err, results) => {
        if (err) return res.status(500).json({ message: 'Error saving user' });
        res.status(200).json({ message: 'User registered successfully' });
      });
    });
  });
});

// Login route
// Login route
// Login route
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Check if the user exists
  User.findUserByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = results[0];

    // If the account is locked, return an error
    if (isAccountLocked(user.locked_until)) {
      return res.status(400).json({ message: 'Account is locked. Please try again later.' });
    }

    // Compare the entered password with the hashed password stored in the database
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).json({ message: 'Error comparing password' });

      if (isMatch) {
        // Password matched
        User.resetLoginAttempts(user.id, (err) => {
          if (err) return res.status(500).json({ message: 'Error resetting login attempts' });

          const token = jwt.sign({ id: user.id, role: user.role }, 'your_secret_key', { expiresIn: '1h' });
          return res.status(200).json({
            message: 'Login successful',
            token: token,
            role: user.role,
            email: user.email,  // Send email in response
          });
        });
      } else {
        // Password mismatch: Increment the login attempts
        User.incrementLoginAttempts(user.id, user.login_attempts + 1, (err) => {
           // Log the attempts value for debugging
          
          if (err) return res.status(500).json({ message: 'Error incrementing login attempts' });

          // Lock the account if the user has 3 failed attempts
          if (user.login_attempts + 1 >= 3) {
            const lockTime = new Date();
            lockTime.setMinutes(lockTime.getMinutes() + 10);  // Lock for 10 minutes
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
