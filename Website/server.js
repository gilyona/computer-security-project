const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('./config');
const User = require('./models/users.js');
const Client = require('./models/clients.js');
const { validatePassword } = require('./passwordDumbUtils');
const jwt = require('jsonwebtoken'); 
const db = require('./models/db');

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create the transporter with Mailjet settings
const transporter = nodemailer.createTransport({
    service: 'Mailjet',
    auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass,
    },
    host: config.email.host,
    port: config.email.port,
});

// Update the reset code storage with expiration
const resetCodeMap = new Map();

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

app.post('/send-reset-code', async (req, res) => {
    const email = req.body.email;
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expirationTime = Date.now() + 30 * 60 * 1000; // 30 minutes expiration

    const hash = crypto.createHash('sha1').update(resetCode).digest('hex');
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

// Registration route
app.post('/register', (req, res) => {
    const { email, password, confirmPassword } = req.body;

    // Basic email validation
    if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    // Password validation
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // UNSAFE: Vulnerable to SQL injection
    const checkQuery = `SELECT * FROM users WHERE email = '${email}'`;
    console.log('DEBUG - Check Query:', checkQuery);

    db.query(checkQuery, (err, results) => {
        if (err) {
            console.error('DEBUG - Error:', err);
            return res.status(500).json({ 
                message: 'Database error',
                sqlError: err.message,
                sqlQuery: checkQuery
            });
        }

        console.log('Found records:', results);

        if (results.length > 0) {
            const formattedRecords = results.map(user => ({
                ID: user.id,
                Email: user.email,
                Password: user.password,
                LoginAttempts: user.login_attempts,
                PasswordHistory: user.password_history
            }));

            return res.status(400).json({ 
                message: 'SQL Injection Results:',
                details: `Found ${results.length} users in database:`,
                userRecords: formattedRecords,
                sqlQuery: checkQuery
            });
        }

        // Hash the password before storing
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

// Login route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Remove the password check from the query to allow proper hash verification
    const query = `SELECT * FROM users WHERE email = '${email}'`;
    console.log('DEBUG - Login Query:', query);
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('DEBUG - Error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        console.log('DEBUG - Results:', results);
        
        // SQL injection will work because of string concatenation
        if (email.includes("'") || email.includes('"')) {
            if (results.length > 0) {
                const user = results[0];
                const token = jwt.sign({ id: user.id }, 'your_secret_key', { expiresIn: '1h' });
                return res.status(200).json({
                    message: 'Login successful',
                    token: token,
                    email: user.email
                });
            }
        }

        // Normal login with password verification
        if (results.length > 0) {
            const user = results[0];
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    return res.status(500).json({ message: 'Error verifying password' });
                }

                if (isMatch) {
                    const token = jwt.sign({ id: user.id }, 'your_secret_key', { expiresIn: '1h' });
                    return res.status(200).json({
                        message: 'Login successful',
                        token: token,
                        email: user.email
                    });
                } else {
                    return res.status(400).json({ message: 'Invalid email or password' });
                }
            });
        } else {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
    });
});

// Client Routes
app.get('/api/clients', (req, res) => {
    Client.getAllClients((err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.status(200).json(results);
    });
});

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

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});