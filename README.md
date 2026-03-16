# LocalMed - Hyperlocal Medicine Availability Platform

LocalMed is a hyperlocal, real-time medicine availability platform - "Google Maps for Medicines".

## Architecture

This is a monorepo with the following packages:

- **apps/api** - Node.js + Express backend API
- **apps/web** - Next.js web frontend
- **apps/mobile** - React Native + Expo mobile app
- **packages/shared** - Shared utilities
- **packages/types** - TypeScript type definitions
- **packages/eslint-config** - Shared ESLint configuration

## Quick Start

### Prerequisites

- Node.js 22.x LTS
- Docker and Docker Compose
- npm 10+

### Setup

1. **Clone and install dependencies:**
   ```bash
   cd localmed
   npm install
   ```

2. **Start infrastructure services:**
   ```bash
   docker-compose up -d
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

5. **Seed initial data (optional):**
   ```bash
   npm run db:seed
   ```

6. **Start development servers:**
   ```bash
   # Start all services
   npm run dev

   # Or start individually
   npm run dev:api
   npm run dev:web
   ```

## Available Scripts

- `npm run dev` - Start API and web in development mode
- `npm run build` - Build all packages
- `npm run test` - Run all tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data

## Project Structure

```
localmed/
├── apps/
│   ├── api/                    # Backend API
│   │   ├── src/
│   │   │   ├── app.ts          # Express app setup
│   │   │   ├── config/         # Configuration modules
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── modules/        # Feature modules
│   │   │   ├── services/       # Shared services
│   │   │   └── types/          # TypeScript types
│   │   └── database/
│   │       ├── migrations/     # Database migrations
│   │       └── seeds/           # Seed data
│   ├── web/                    # Next.js web app
│   └── mobile/                 # React Native app
├── packages/
│   ├── shared/                 # Shared utilities
│   ├── types/                  # Type definitions
│   └── eslint-config/          # ESLint config
└── docker-compose.yml          # Local development services
```

## Technology Stack

### Backend
- Node.js 22.x + Express 5.x
- PostgreSQL 16 + PostGIS 3.4
- Redis 7.x
- BullMQ for background jobs
- Socket.IO for real-time features

### Frontend
- Next.js 15.x (App Router)
- Tailwind CSS 4.x + shadcn/ui
- Zustand for state management
- TanStack Query for data fetching

### Mobile
- React Native 0.76.x + Expo 52.x
- Expo Router for navigation
- react-native-maps for maps

## License

MIT