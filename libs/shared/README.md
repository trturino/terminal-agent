# @terminal-agent/shared

Shared types and utilities for the Terminal Agent project.

## Installation

This package is part of the monorepo and will be automatically linked. No need to install it separately.

## Usage

```typescript
import { Message, TaskMessage, TaskResultMessage, schemas } from '@terminal-agent/shared';

// Create a task message
const task: TaskMessage = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  type: 'command',
  command: 'ls',
  args: ['-la'],
  cwd: '/home/user',
};

// Validate a message
const result = schemas.TaskMessageSchema.safeParse(task);
if (result.success) {
  console.log('Valid task message:', result.data);
} else {
  console.error('Invalid task message:', result.error);
}
```

## Development

### Build

```bash
pnpm build
```

### Watch Mode

```bash
pnpm dev
```

### Linting

```bash
pnpm lint
```

### Testing

```bash
pnpm test
```
