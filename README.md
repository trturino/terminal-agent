# Terminal Agent

A distributed terminal task runner with a worker pool architecture.

## Project Structure

This is a monorepo managed with [Turborepo](https://turbo.build/) and includes the following packages:

- `apps/` - Contains the main applications
  - `api/` - The API service
  - `worker/` - The worker service
- `libs/` - Contains shared libraries
  - `shared/` - Shared types and utilities

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm (v9 or later) or pnpm (v8 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/terminal-agent.git
   cd terminal-agent
   ```

2. Install dependencies:
   ```bash
   # Using pnpm (recommended)
   npm install -g pnpm
   pnpm install
   ```

   Or with npm:
   ```bash
   npm install
   ```

### Development

#### Shared Library

The shared library (`@terminal-agent/shared`) contains common types and utilities used across the project.

```bash
# Navigate to the shared library
cd libs/shared

# Build the library
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Lint the code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

#### Running Services

Start the API and worker services in development mode:

```bash
# From the root directory
pnpm dev
```

### Building for Production

To build all packages for production:

```bash
pnpm build
```

## Architecture

### Message Flow

1. The API receives a task request
2. The task is validated using the shared schemas
3. The task is queued in Redis
4. An available worker picks up the task
5. The worker executes the task and publishes the result
6. The result is stored and can be retrieved via the API

### Shared Types

The shared library defines the following main types:

- `TaskMessage`: Represents a task to be executed
- `TaskResultMessage`: Represents the result of a task execution
- `Message`: A discriminated union of all message types

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.