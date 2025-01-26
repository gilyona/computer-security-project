// config.js
module.exports = {
    db: {
      host: 'localhost',  // MySQL host
      user: 'root',       // Your MySQL username
      password: '317996981',       // Your MySQL password *CHANGE TO YOUR PASSWORD*
      database: 'holontelecomdb', // Replace with your database name
    },
    email: {
      service: 'Mailjet',  // The name of the service (Mailjet)
      auth: {
        user: '9888df8a7203b0fb7e0688a4d0c0adca',  // Your API Key
        pass: 'f8ace3215ca789ab8ef8261cc6a44900'   // Your API Secret
      },
      host: 'in-v3.mailjet.com',  // The SMTP of Mailjet
      port: 587,  // The SMTP port of Mailjet
    }

  };
  