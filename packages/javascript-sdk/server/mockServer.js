const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json());

// Mock endpoint for event tracking
app.post('/api/v1/event', (req, res) => {
    console.log('Received event:', req.body);
    res.status(200).json({ success: true, message: 'Event received' });
});

// Start the server
app.listen(port, () => {
    console.log(`Mock server running at http://localhost:${port}`);
});
