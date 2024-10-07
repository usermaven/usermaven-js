const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const winston = require('winston');
const colors = require('colors/safe');

const app = express();
const port = 3000;

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
            const coloredLevel = level === 'info'
                ? colors.blue(level)
                : level === 'warn'
                    ? colors.yellow(level)
                    : colors.red(level);
            return `${colors.gray(timestamp)} [${coloredLevel}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'mock-server.log' })
    ]
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));

// Custom middleware to log request body
app.use((req, res, next) => {
    if (req.method === 'POST') {
        logger.info(`${colors.green('Request Body:')} ${JSON.stringify(req.body, null, 2)}`);
    }
    next();
});

// Mock endpoint for event tracking
app.post('/api/v1/event', (req, res) => {
    logger.info(colors.magenta('Received event:'));
    logger.info(JSON.stringify(req.body, null, 2));

    // Simulate processing delay
    setTimeout(() => {
        res.status(200).json({ success: true, message: 'Event received and processed' });
    }, 200);
});

app.post('/api/v1/s2s/event', (req, res) => {
    logger.info(colors.magenta('Received event:'));
    logger.info(JSON.stringify(req.body, null, 2));

    // Simulate processing delay
    setTimeout(() => {
        res.status(200).json({ success: true, message: 'Server Side Event received and processed' });
    }, 200);
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(colors.red('Error:'), err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(port, () => {
    logger.info(colors.green(`Mock server running at http://localhost:${port}`));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info(colors.yellow('SIGTERM signal received: closing HTTP server'));
    app.close(() => {
        logger.info(colors.yellow('HTTP server closed'));
    });
});
