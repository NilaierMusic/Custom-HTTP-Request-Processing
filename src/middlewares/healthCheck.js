// Middleware to add a health check route to the application
module.exports = function (app) {
    // Define a route to check the health of the service
    app.get('/health', (req, res) => {
        res.status(200).send('OK');
    });
};