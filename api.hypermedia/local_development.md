# Local Development Setup

This guide explains how to run the API.Hypermedia Lambda function locally for development.

## Overview

The `dev_server.ts` provides an Express wrapper around the Lambda handler, allowing you to:
- Run the API locally without deploying to AWS
- Use hot reloading for faster development
- Connect to remote AWS services (Cognito, Athena, S3)
- Test with the web frontend in development mode

## Setup

1. **Install dependencies**
   ```bash
   cd api.hypermedia
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Ensure you have a development config file**
   The infrastructure should generate `config/development.config.json`. If not present, you'll need to create it with the necessary AWS resource configurations.

## Running the Dev Server

```bash
npm run dev
```

This starts the Express server on port 3001 (configurable via PORT env var) with:
- Hot reloading via tsx watch
- CORS enabled for local frontend (http://localhost:5173)
- All Lambda routes mapped to Express endpoints

## Available Endpoints

- `GET /health` - Health check
- `GET /` - Root hypermedia endpoint
- `POST /auth/signin` - Authentication
- `POST /auth/signout` - Sign out
- `GET /api-keys` - List API keys (requires auth)
- `DELETE /api-keys/:key_id` - Delete API key (requires auth)
- `GET /sessions` - List sessions (requires auth)
- `DELETE /sessions/:session_id` - Delete session (requires auth)

## How It Works

1. **Request Translation**: Express requests are converted to ALBEvent format
2. **Lambda Handler**: The existing Lambda handler processes the event
3. **Response Translation**: ALBResult is converted back to Express response

This approach ensures:
- No changes to Lambda code
- Same authentication/authorization flow
- Identical request/response handling
- Full compatibility with production behavior

## Testing with Frontend

To connect the web frontend to the local API:

1. Start the API dev server: `npm run dev`
2. Configure the web project to use `http://localhost:3001` as the API base URL
3. Start the web dev server: `cd ../web && npm run dev`

## Debugging

- Check console output for request logs
- Use Chrome DevTools for frontend debugging
- AWS SDK calls still go to real AWS services
- Environment variables control behavior

## Environment Variables

Key variables in `.env`:

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development)
- `AWS_REGION` - AWS region for services
- `CONFIG_FILE_PATH` - Path to config file
- `LOG_LEVEL` - Logging verbosity
- `ALLOWED_ORIGINS` - CORS origins

## Troubleshooting

**Port already in use**: Change PORT in .env or kill the process using the port

**Authentication errors**: Ensure you have valid AWS credentials configured

**Config file not found**: Check that infrastructure has generated the development config

**CORS errors**: Verify ALLOWED_ORIGINS includes your frontend URL