import { Environment } from "@houseofwolves/serverlesslaunchpad.core";
import "reflect-metadata"; // Must be imported first for decorators to work

// Parse command line argument for environment
const environmentArg = process.argv[2] || "local";
const validEnvironments = Object.values(Environment);

if (!validEnvironments.includes(environmentArg as Environment)) {
    console.error(`❌ Invalid environment: ${environmentArg}`);
    console.error(`   Valid environments: ${validEnvironments.join(", ")}`);
    process.exit(1);
}

const environment = environmentArg as Environment;

// Set NODE_ENV for ConfigStore to use
process.env.NODE_ENV = environment;

console.log(`🚀 Starting API development server for environment: ${environment}`);
console.log(`📄 Configuration will be loaded from config/${environment}.infrastructure.json`);

// Import everything after setting NODE_ENV
import { ALBEvent, ALBResult } from "aws-lambda";
import express from "express";
import { handler } from "./index";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// CORS for local development
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, X-Forwarded-For"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
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
        } else if (typeof value === "string") {
            headers[key.toLowerCase()] = value;
        }
    });

    // Extract path parameters from route params
    const pathParameters = req.params && Object.keys(req.params).length > 0 ? req.params : null;

    // Create mock ALBEvent for dev server - use type assertion to avoid strict checking
    return {
        requestContext: {
            elb: {
                targetGroupArn:
                    "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/local-dev/50dc6c495c0c9188",
            },
        },
        httpMethod: req.method,
        path: req.originalUrl.split("?")[0], // Use originalUrl to get the full path, strip query params
        pathParameters,
        queryStringParameters: req.query as Record<string, string> | null,
        multiValueQueryStringParameters: {},
        headers,
        multiValueHeaders,
        body: req.body ? JSON.stringify(req.body) : null,
        isBase64Encoded: false,
    } as ALBEvent;
}

// Convert ALBResult to Express response
function albResultToExpress(result: ALBResult, res: express.Response): void {
    // Set status code
    res.status(result.statusCode);

    // Set headers - convert boolean values to strings for Express compatibility
    if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
            res.setHeader(key, String(value));
        });
    }

    if (result.multiValueHeaders) {
        Object.entries(result.multiValueHeaders).forEach(([key, values]) => {
            values.forEach((value) => res.setHeader(key, String(value)));
        });
    }

    // Send body
    if (result.body) {
        if (result.isBase64Encoded) {
            res.send(Buffer.from(result.body, "base64"));
        } else {
            // Parse JSON if content-type is JSON
            const contentType = result.headers?.["content-type"] || "";
            if (typeof contentType === "string" && contentType.includes("application/json")) {
                res.json(JSON.parse(result.body));
            } else {
                res.send(result.body);
            }
        }
    } else {
        res.end();
    }
}

// Catch-all route - delegate everything to the main Lambda handler
app.use("*", async (req, res) => {
    const event = expressToALBEvent(req);
    const result = await handler(event);
    albResultToExpress(result, res);
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Express error:", err);
    res.status(500).json({
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected error occurred",
        },
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 API development server running at http://localhost:${PORT}`);
    console.log(`📝 Environment: ${environment}`);
    console.log(`🎯 All requests delegated to main Lambda handler`);
});
