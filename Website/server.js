const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const crypto = require('crypto'); // הוספנו את ה-crypto לשם חישוב ה-hash
const config = require('./config');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// צור את הטרנספוטר עם הגדרות ה-Mailjet
const transporter = nodemailer.createTransport({
  service: 'Mailjet',  // Mailjet כשרות
  auth: {
    user: config.email.auth.user,  // API Key שלך
    pass: config.email.auth.pass   // API Secret שלך
  },
  host: config.email.host,  // ה-SMTP של Mailjet
  port: config.email.port   // פורט ה-SMTP של Mailjet
});

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Update the reset code storage with expiration
const resetCodeMap = new Map();

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

// Route to handle password reset
app.post('/reset-password', async (req, res) => {
  const { email, password } = req.body;

  if (!resetCodeMap[email]) {
    return res.status(400).json({ message: 'Password reset session expired' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email],
      (error, results) => {
        if (error) {
          console.error('Error updating password:', error);
          return res.status(500).json({ message: 'Error updating password' });
        }

        delete resetCodeMap[email];
        res.json({ message: 'Password updated successfully' });
      }
    );
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).json({ message: 'Error updating password' });
  }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
