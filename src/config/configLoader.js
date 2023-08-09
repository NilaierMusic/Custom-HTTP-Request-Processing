const config = require('config');

// Function to load configuration values
function loadConfig(key, defaultValue) {
    if (config.has(key)) {
        return config.get(key);
    } else {
        require('dotenv').config();
        return process.env[key.replace('.', '_').toUpperCase()] || defaultValue;
    }
}

// Export the configuration loader function
module.exports = loadConfig;