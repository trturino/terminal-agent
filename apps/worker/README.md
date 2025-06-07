# Terminal Agent Worker

This service processes jobs from a Redis queue, renders Liquid templates, takes screenshots with Playwright, processes images with Sharp, and uploads them to S3.

## Features

- Processes jobs from a Redis queue (BullMQ)
- Renders Liquid templates
- Takes screenshots using Playwright (Chromium)
- Processes images with Sharp (color conversion, resizing, etc.)
- Uploads processed images to S3-compatible storage
- Handles job retries and errors
- Supports multiple color schemes and image formats

## Prerequisites

- Node.js 18+
- npm or yarn
- Docker and Docker Compose (for local development)
- Playwright browsers (installed automatically)

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Node environment | No | `development` |
| `QUEUE_REDIS_URL` | Redis connection URL | Yes | |
| `AWS_REGION` | AWS region for S3 | Yes | |
| `AWS_ENDPOINT` | S3 endpoint URL | Yes (for MinIO) | |
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes | |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Yes | |
| `S3_BUCKET` | S3 bucket name | Yes | |
| `PLAYWRIGHT_CHROMIUM_ARGS` | Additional Chromium launch arguments | No | |

## Local Development

1. Start the required services:
   ```bash
   docker-compose up -d redis minio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

4. Start the worker in development mode:
   ```bash
   npm run dev
   ```

## Building for Production

```bash
# Build the application
npm run build

# Start the application
npm start
```

## Docker

Build and run the worker with all dependencies:

```bash
docker-compose up -d --build worker
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Linting

```bash
# Check for linting errors
npm run lint

# Fix linting errors
npm run lint:fix
```

## Deployment

The application is designed to be deployed as a Docker container. The `Dockerfile` includes all necessary dependencies.

## License

ISC
