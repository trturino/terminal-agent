FROM mcr.microsoft.com/playwright:v1.50.0-noble

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and pnpm
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest && \
    npm install -g pnpm

# Copy root package.json and pnpm workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy app and libs directories
COPY apps/worker ./apps/worker
COPY libs ./libs

# Set up pnpm workspace and install dependencies
RUN pnpm install -r --frozen-lockfile

# Build the application
RUN pnpm run --filter worker build

# Set environment variables
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Set the command to run the application
WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
