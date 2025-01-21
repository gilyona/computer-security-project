// passwordDumbConfig.js

module.exports = {
    minLength: 1,  // Minimum password length
    maxLength: 20,  // Maximum password length (optional, but useful)
    complexity: {
      upperCase: false,      // Require at least one uppercase letter
      lowerCase: false,      // Require at least one lowercase letter
      digits: false,         // Require at least one digit
      specialChars: false,   // Require at least one special character (e.g., @, #, $, etc.)
    },
    checkDictionary: false,  // Whether to prevent dictionary words (optional)
  };
  