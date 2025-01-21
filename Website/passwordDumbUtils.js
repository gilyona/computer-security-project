// passwordDumbUtils.js
const passwordConfig = require('./passwordDumbConfig'); // Import password dumb rules

// Function to validate password against configuration
const validatePassword = (password, confirmPassword) => {
    const { minLength, maxLength, complexity, checkDictionary } = require('./passwordDumbConfig');
  
    if (password !== confirmPassword) {
      return 'Password and confirm password do not match.';
    }
  
    return null; // No validation errors
  };


module.exports = { validatePassword }; // Export for use
