module.exports = {
  db: {
    host: 'localhost',  // MySQL host
    user: 'root',       // Your MySQL username
    password: '159159Sss',  // Your MySQL password
    database: 'holontelecomdb',  // Your database name
  },
  email: {
    service: 'Mailjet',  // השם של השירות (Mailjet)
    auth: {
      user: '9888df8a7203b0fb7e0688a4d0c0adca',  // API Key שלך
      pass: 'f8ace3215ca789ab8ef8261cc6a44900'   // API Secret שלך
    },
    host: 'in-v3.mailjet.com',  // ה-SMTP של Mailjet
    port: 587,  // פורט ה-SMTP של Mailjet
  }
};
