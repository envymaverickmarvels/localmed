# LocalMed Developer Setup Guide

## Prerequisites

- **Node.js**: v22.x LTS or higher
- **npm**: v10.x or higher
- **Docker**: Latest version
- **Docker Compose**: v2.x or higher
- **Git**: Latest version

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/localmed/localmed.git
cd localmed
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` and configure:
- `JWT_SECRET` - Generate a secure secret (at least 32 characters)
- `DATABASE_URL` - Database connection string
- `REDIS_URL` - Redis connection string

### 4. Start Infrastructure Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL with PostGIS extension (port 5432)
- Redis (port 6379)
- MinIO for file storage (ports 9000, 9001)

### 5. Run Database Migrations

```bash
npm run db:migrate
```

### 6. Seed Sample Data (Optional)

```bash
npm run db:seed
```

### 7. Start Development Servers

```bash
# Start API server
npm run dev:api

# In another terminal, start web frontend
npm run dev:web
```

## Project Structure

```
localmed/
├── apps/
│   ├── api/                    # Backend API (Express + TypeScript)
│   │   ├── src/
│   │   │   ├── app.ts          # Entry point
│   │   │   ├── config/         # Configuration
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── modules/        # Feature modules
│   │   │   │   ├── auth/
│   │   │   │   ├── medicine/
│   │   │   │   ├── pharmacy/
│   │   │   │   ├── inventory/
│   │   │   │   ├── search/
│   │   │   │   ├── reservation/
│   │   │   │   ├── delivery/
│   │   │   │   ├── prescription/
│   │   │   │   ├── notification/
│   │   │   │   └── admin/
│   │   │   ├── services/      # External services
│   │   │   ├── socket/        # Socket.IO handlers
│   │   │   ├── jobs/           # BullMQ workers
│   │   │   └── types/         # TypeScript types
│   │   └── database/
│   │       ├── migrations/     # SQL migrations
│   │       └── seeds/          # Seed data
│   │
│   ├── web/                    # Web Frontend (Next.js)
│   │   ├── app/                # App router pages
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom hooks
│   │   ├── lib/                # Utilities
│   │   └── stores/             # Zustand stores
│   │
│   └── mobile/                 # Mobile App (Expo)
│       ├── app/                # Expo router screens
│       ├── components/         # React Native components
│       ├── stores/             # Zustand stores
│       └── lib/                # Utilities
│
├── packages/
│   ├── shared/                 # Shared utilities
│   ├── types/                  # TypeScript types
│   └── eslint-config/          # Shared ESLint config
│
├── docker-compose.yml          # Development services
└── package.json               # Monorepo root
```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run API tests
npm run test --workspace=apps/api

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Database Management

```bash
# Run migrations
npm run db:migrate

# Reset database (WARNING: destructive)
npm run db:reset

# Seed sample data
npm run db:seed
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Format with Prettier
npm run format
```

## API Development

### Creating a New Module

1. Create module directory:
```bash
mkdir -p apps/api/src/modules/new-module
```

2. Create route file (`routes.ts`):
```typescript
import { Router } from 'express';
import { validateBody } from '../../middleware/validate';
import * as controller from './controller';

const router = Router();

router.post('/', validateBody(schema), controller.create);

export default router;
```

3. Create controller (`controller.ts`):
```typescript
export async function create(req: Request, res: Response): Promise<void> {
  // Implementation
}
```

4. Register routes in `apps/api/src/routes/index.ts`.

### Adding a Database Migration

1. Create migration file:
```bash
touch apps/api/database/migrations/002_add_new_table.sql
```

2. Write migration SQL:
```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/test/production) | Yes |
| `PORT` | Server port | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `MSG91_API_KEY` | MSG91 SMS API key | No |
| `FIREBASE_PROJECT_ID` | Firebase project for push notifications | No |
| `GOOGLE_CLOUD_PROJECT_ID` | Google Cloud for OCR | No |
| `SENTRY_DSN` | Sentry error tracking | No |

## Debugging

### VS Code Launch Configuration

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:api"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Database Debugging

Connect to PostgreSQL:
```bash
docker exec -it localmed-postgres psql -U localmed -d localmed
```

Common queries:
```sql
-- List all tables
\dt

-- Check users
SELECT * FROM users LIMIT 5;

-- Check pharmacies with PostGIS
SELECT id, name, ST_AsText(location) FROM pharmacies;
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Redis Connection Issues

```bash
# Check Redis
docker exec -it localmed-redis redis-cli ping
```

## Useful Commands

```bash
# View API logs
docker-compose logs -f api

# Clear all data
npm run db:reset && npm run db:seed

# Check code types
npx tsc --noEmit
```