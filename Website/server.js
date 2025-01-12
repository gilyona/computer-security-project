const express = require('express');
const cors = require('cors');
const path = require('path'); // To serve static files
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('./config');
const User = require('./models/users.js');
const Client = require('./models/clients.js');
const { validatePassword } = require('./passwordUtils'); // Import password validation logic
const jwt = require('jsonwebtoken'); 
const db= require('./models/db');


const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create the transporter with Mailjet settings
const transporter = nodemailer.createTransport({
  service: 'Mailjet', // Mailjet as the service
  auth: {
    user: config.email.auth.user, // Your API Key
    pass: config.email.auth.pass, // Your API Secret
  },
  host: config.email.host, // SMTP host of Mailjet
  port: config.email.port, // SMTP port of Mailjet
});
app.post('/verify-reset-code', (req, res) => {
  const { verificationCode, email } = req.body;
  const resetData = resetCodeMap.get(email);

  if (!resetData) {
    return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
  }

  if (Date.now() > resetData.expirationTime) {
    resetCodeMap.delete(email);
    return res.status(400).json({ message: 'Verification code has expired.' });
  }

  const hash = crypto.createHash('sha1').update(verificationCode).digest('hex');
  if (resetData.hash === hash) {
    res.json({ message: 'Code verified successfully.' });
  } else {
    res.status(400).json({ message: 'Invalid verification code.' });
  }
});

// Update the reset code storage with expiration
const resetCodeMap = new Map();

// Route to send reset code to the user's email
app.post('/send-reset-code', async (req, res) => {
  const email = req.body.email;
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expirationTime = Date.now() + 30 * 60 * 1000; // 30 minutes expiration

  // Calculate hash of the code
  const hash = crypto.createHash('sha1').update(resetCode).digest('hex');

  // Store hash and expiration
  resetCodeMap.set(email, {
    hash,
    expirationTime,
  });

  try {
    await transporter.sendMail({
      from: 'holontelecom@gmail.com',
      to: email,
      subject: 'Password Reset Code - Holon Telecom',
      text: `Your verification code is: ${resetCode}\n\nThis code will expire in 30 minutes.\n\nIf you did not request this code, please ignore this email.`,
    });

    res.json({ message: 'Verification code sent successfully. Please check your email.' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Error sending verification code. Please try again later.' });
  }
});

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


// User registration route
app.post('/register', (req, res) => {
  const { email, password, confirmPassword } = req.body;

  const validationError = validatePassword(password, confirmPassword);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  User.findUserByEmail(email, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ message: 'Error hashing password' });
      }

      User.createUser(email, hashedPassword, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error saving user' });
        }
        res.status(200).json({ message: 'User registered successfully' });
      });
    });
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  User.findUserByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = results[0];

    if (User.isAccountLocked(user.locked_until)) {
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

// Client Routes

// Fetch all clients
app.get('/api/clients', (req, res) => {
  Client.getAllClients((err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(200).json(results);
  });
});

// Add a new client
app.post('/api/clients', (req, res) => {
  const { first_name, last_name, phone_number, email, address, package } = req.body;

  if (!first_name || !last_name || !phone_number || !email) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const emailCheckQuery = 'SELECT * FROM clients WHERE email = ?';
  db.query(emailCheckQuery, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already in use!' });
    }

    const clientData = { first_name, last_name, phone_number, address, email, package };
    Client.createClient(clientData, (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      res.status(201).json({
        message: 'Client added successfully',
        first_name,
        last_name,
      });
    });
  });
});

// Delete a client
app.delete('/api/clients/:id_clients', (req, res) => {
  const clientId = req.params.id_clients;

  Client.getClientById(clientId, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const client = results[0];

    Client.deleteClient(clientId, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      res.status(200).json({
        message: 'Client deleted successfully',
        first_name: client.first_name,
      });
    });
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
