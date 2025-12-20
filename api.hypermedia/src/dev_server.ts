import express from 'express';
import { ALBEvent, ALBResult } from 'aws-lambda';
import { handler } from './index.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for local development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173'); // Vite default port
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Convert Express request to ALBEvent
function expressToALBEvent(req: express.Request): ALBEvent {
    const headers: Record<string, string> = {};
    const multiValueHeaders: Record<string, string[]> = {};
    
    // Convert headers
    Object.entries(req.headers).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            multiValueHeaders[key.toLowerCase()] = value;
            headers[key.toLowerCase()] = value[0];
        } else if (typeof value === 'string') {
            headers[key.toLowerCase()] = value;
        }
    });

    // Extract path parameters from route params
    const pathParameters = req.params && Object.keys(req.params).length > 0 ? req.params : null;

    return {
        requestContext: {
            elb: {
                targetGroupArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/local-dev/50dc6c495c0c9188'
            }
        },
        httpMethod: req.method,
        path: req.path,
        pathParameters,
        queryStringParameters: req.query as Record<string, string>,
        multiValueQueryStringParameters: {}, // Express doesn't parse multi-value params by default
        headers,
        multiValueHeaders,
        body: req.body ? JSON.stringify(req.body) : null,
        isBase64Encoded: false
    };
}

// Convert ALBResult to Express response
function albResultToExpress(result: ALBResult, res: express.Response): void {
    // Set status code
    res.status(result.statusCode);
    
    // Set headers
    if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
    }
    
    if (result.multiValueHeaders) {
        Object.entries(result.multiValueHeaders).forEach(([key, values]) => {
            values.forEach(value => res.setHeader(key, value));
        });
    }
    
    // Send body
    if (result.body) {
        if (result.isBase64Encoded) {
            res.send(Buffer.from(result.body, 'base64'));
        } else {
            // Parse JSON if content-type is JSON
            const contentType = result.headers?.['content-type'] || '';
            if (contentType.includes('application/json')) {
                res.json(JSON.parse(result.body));
            } else {
                res.send(result.body);
            }
        }
    } else {
        res.end();
    }
}

// Health check endpoint
app.get('/health', async (req, res) => {
    const event = expressToALBEvent(req);
    const result = await handler(event);
    albResultToExpress(result, res);
});

// Root endpoint
app.get('/', async (req, res) => {
    const event = expressToALBEvent(req);
    const result = await handler(event);
    albResultToExpress(result, res);
});

// Authentication endpoints
app.post('/auth/signin', async (req, res) => {
    const event = expressToALBEvent(req);
    const result = await handler(event);
    albResultToExpress(result, res);
});

app.post('/auth/signout', async (req, res) => {
    const event = expressToALBEvent(req);
    const result = await handler(event);
    albResultToExpress(result, res);
});

// API Keys endpoints
app.get('/api-keys', async (req, res) => {
    const event = expressToALBEvent(req);
    const result = await handler(event);
    albResultToExpress(result, res);
});

app.delete('/api-keys/:key_id', async (req, res) => {
    const event = expressToALBEvent(req);
    const result = await handler(event);
    albResultToExpress(result, res);
});

// Sessions endpoints
app.get('/sessions', async (req, res) => {
    const event = expressToALBEvent(req);
    const result = await handler(event);
    albResultToExpress(result, res);
});

app.delete('/sessions/:session_id', async (req, res) => {
    const event = expressToALBEvent(req);
    const result = await handler(event);
    albResultToExpress(result, res);
});

// Catch-all route for undefined endpoints
app.use('*', async (req, res) => {
    const event = expressToALBEvent(req);
    const result = await handler(event);
    albResultToExpress(result, res);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express error:', err);
    res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 API development server running at http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('\nAvailable endpoints:');
    console.log('  GET  /health');
    console.log('  GET  /');
    console.log('  POST /auth/signin');
    console.log('  POST /auth/signout');
    console.log('  GET  /api-keys');
    console.log('  DELETE /api-keys/:key_id');
    console.log('  GET  /sessions');
    console.log('  DELETE /sessions/:session_id');
});