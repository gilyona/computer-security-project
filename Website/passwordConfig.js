// passwordConfig.js

module.exports = {
    minLength: 10,  // Minimum password length
    maxLength: 20,  // Maximum password length (optional, but useful)
    complexity: {
      upperCase: true,      // Require at least one uppercase letter
      lowerCase: true,      // Require at least one lowercase letter
      digits: true,         // Require at least one digit
      specialChars: true,   // Require at least one special character (e.g., @, #, $, etc.)
    },
    checkDictionary: true,  // Whether to prevent dictionary words (optional)
  };
  