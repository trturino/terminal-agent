# @terminal-agent/shared

Shared types and utilities for the Terminal Agent project.

## Installation

This package is part of the monorepo and will be automatically linked. No need to install it separately.

## Usage

```typescript
import { S3Service, FileService } from '@terminal-agent/shared';
import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });
const s3Service = new S3Service(s3, 'my-bucket');
const fileService = new FileService(s3Service);

await fileService.uploadFile('device123', Buffer.from('hello'), 'example.txt');
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
