const express = require('express');
const cors = require('cors');
const path = require('path');  // To serve static iiles
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('./config');
const { validatePassword } = require('./passwordUtils'); // Import password validation logic
const app = express();


// Enable CORS
app.use(cors());
app.use(express.json());  // To parse incoming JSON requests

// Serve static files (like HTML, CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Create the transporter with Mailjet settings
const transporter = nodemailer.createTransport({
  service: 'Mailjet',  // Mailjet as the service
  auth: {
    user: config.email.auth.user,  // Your API Key
    pass: config.email.auth.pass   // Your API Secret
  },
  host: config.email.host,  // SMTP host of Mailjet
  port: config.email.port   // SMTP port of Mailjet
});

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route to send reset code to the user's email
app.post('/send-reset-code', async (req, res) => {
  const email = req.body.email;
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expirationTime = Date.now() + (30 * 60 * 1000); // 30 minutes expiration

  // Calculate hash of the code
  const hash = crypto.createHash('sha1').update(resetCode).digest('hex');
  
  // Store hash and expiration
  resetCodeMap.set(email, {
      hash,
      expirationTime
  });

  try {
      await transporter.sendMail({
          from: 'holontelecom@gmail.com', // ה-From שלך
          to: email,
          subject: 'Password Reset Code - Holon Telecom',
          text: `Your verification code is: ${resetCode}\n\nThis code will expire in 30 minutes.\n\nIf you did not request this code, please ignore this email.`
      });

      res.json({ message: 'Verification code sent successfully. Please check your email.' });
  } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: 'Error sending verification code. Please try again later.' });
  }
});

// Route to verify the code entered by the user
app.post('/verify-reset-code', (req, res) => {
  const { verificationCode, email } = req.body;
  const resetData = resetCodeMap.get(email);

  if (!resetData) {
      return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
  }

  if (Date.now() > resetData.expirationTime) {
      resetCodeMap.delete(email);
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
  }

  const verificationHash = crypto.createHash('sha1').update(verificationCode).digest('hex');

  if (resetData.hash === verificationHash) {
      res.json({ message: 'Code verified successfully.' });
  } else {
      res.status(400).json({ message: 'Invalid verification code.' });
  }
});

// Update the reset code storage with expiration
const resetCodeMap = new Map();

// Route to update the user's password after reset
app.post('/reset-password', async (req, res) => {
  const { email, password } = req.body;

  if (!resetCodeMap.get(email)) {
    return res.status(400).json({ message: 'Password reset session expired' });
  }

  const validationError = validatePassword(password, password);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    db.query(
      'SELECT password_history, password_history_limit FROM users WHERE email = ?',
      [email],
      async (error, results) => {
        if (error || results.length === 0) {
          return res.status(400).json({ message: 'User not found' });
        }

        const passwordHistory = results[0].password_history || [];
        const historyLimit = results[0].password_history_limit || 3;

        // Check for reused passwords
        const isReused = await Promise.all(
          passwordHistory.map(async (oldHash) => {
            const match = await bcrypt.compare(password, oldHash);
            console.log(`Comparing ${password} with hash ${oldHash}: ${match}`);
            return match;
          })
        ).then((results) => results.includes(true));

        if (isReused) {
          return res.status(400).json({
            message: 'You cannot reuse a previously used password.',
          });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password history
        passwordHistory.push(hashedPassword);
        if (passwordHistory.length > historyLimit) passwordHistory.shift();

        db.query(
          'UPDATE users SET password = ?, password_history = ? WHERE email = ?',
          [hashedPassword, JSON.stringify(passwordHistory), email],
          (updateError) => {
            if (updateError) {
              console.error('Error updating password:', updateError);
              return res.status(500).json({ message: 'Error updating password' });
            }

            resetCodeMap.delete(email);
            res.json({ message: 'Password updated successfully' });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error processing password reset:', error);
    res.status(500).json({ message: 'Error processing password reset' });
  }
});


// Route to verify the code entered by the user
app.post('/verify-reset-code', (req, res) => {
    const { verificationCode, email } = req.body;
    const resetData = resetCodeMap.get(email);

    if (!resetData) {
        return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
    }

    if (Date.now() > resetData.expirationTime) {
        resetCodeMap.delete(email);
        return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    const verificationHash = crypto.createHash('sha1').update(verificationCode).digest('hex');

    if (resetData.hash === verificationHash) {
        res.json({ message: 'Code verified successfully.' });
    } else {
        res.status(400).json({ message: 'Invalid verification code.' });
    }
});



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



// Helper function to check if an account is locked
// Check if the account is locked by comparing `locked_until`
const isAccountLocked = (lockedUntil) => {
  if (!lockedUntil) return false; // Account is not locked
  const currentTime = new Date();
  return new Date(lockedUntil) > currentTime; // Account is locked if current time is before locked_until
}


// User registration route
app.post('/register', (req, res) => {
  const { email, password, confirmPassword } = req.body;
  console.log('Incoming request to /register');
  console.log('Request body:', req.body);
  // Validate password complexity and length


  // Validate the password using `validatePassword`
  const validationError = validatePassword(password, confirmPassword); 

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  // Check if the email already exists
  User.findUserByEmail(email, (err, results) => {

    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    // Check if the email is already in use
    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }


    // Hash the password and create the user
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ message: 'Error hashing password' });
      }

      User.createUser(email, hashedPassword, (err) => {
        if (err) {
          console.error('Error saving user:', err);
          return res.status(500).json({ message: 'Error saving user' });
        }
        res.status(200).json({ message: 'User registered successfully' });
      });
    });
  });
});

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
