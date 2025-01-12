const passwordConfig = require('./passwordConfig'); // Import password rules

// Function to validate password against configuration
const validatePassword = (password, confirmPassword) => {
    const { minLength, maxLength, complexity, checkDictionary } = require('./passwordConfig');
  
    if (password !== confirmPassword) {
      return 'Password and confirm password do not match.';
    }
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
  
    return null; // No validation errors
  };
  

// Helper function to check for dictionary words
const words = require('english-words'); // Replace with your actual source

const wordsArray = Object.keys(words);


// Function to check if a password contains dictionary words
const containsDictionaryWord = (password) => {
    const lowerCasePassword = password.toLowerCase();

    for (let word of wordsArray) { // Iterate over the words array
        if (lowerCasePassword.includes(word.toLowerCase())) {
            return true; // Return true if any dictionary word is found in the password
        }
    }
    return false; // Return false if no dictionary words are found
};


module.exports = { validatePassword }; // Export for use
