const config = require('config');

function loadConfig(key, defaultValue) {
    if (config.has(key)) {
        return config.get(key);
    } else {
        require('dotenv').config();
        return process.env[key.replace('.', '_').toUpperCase()] || defaultValue;
    }
}

module.exports = loadConfig;