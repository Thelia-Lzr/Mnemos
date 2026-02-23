# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mnemos is a full-stack AI-powered language learning application with real-time interactive features. The platform provides personalized learning paths, real-time chat, progress tracking, and assessment systems.

**Key Features:**
- AI-driven personalized learning recommendations
- Real-time chat and feedback via Socket.io
- Progress tracking and analytics
- JWT authentication with multi-layer security
- Payment and subscription management
- Multiple question types and assessment system

**Technology Stack:**
- **Backend**: Node.js/Express with TypeScript, PostgreSQL, Redis, Socket.io
- **Frontend**: React 18 with Redux Toolkit, Material-UI, TypeScript
- **Database**: PostgreSQL 15 with connection pooling
- **Cache/Queue**: Redis 7 with Bull for task queues
- **Real-time**: Socket.io for bidirectional communication
- **Containerization**: Docker Compose for development and production

## Common Commands

All development tasks are managed through the Makefile in the project root. Run `make help` for a complete list.

### Initialization and Setup
```bash
make install              # Install all dependencies (backend & frontend)
make setup-dev           # Complete development environment initialization (installs dependencies, starts databases, runs migrations)
make init                # Add test user (thelia@example.com / 123456)
```

### Development
```bash
make dev                 # Start backend development server with hot reload (port 8000)
cd frontend && npm start # Start frontend development server (port 3000)
make start               # Start the built application (production mode)
```

### Building
```bash
make build               # Build both backend and frontend
make build-backend       # Build only the backend
```

### Testing
```bash
make test                # Run all tests
make test-unit           # Run unit tests only
make test-unit-watch     # Run unit tests in watch mode
make test-integration    # Run integration tests
make test-property       # Run property-based tests (using fast-check)
make test-coverage       # Generate test coverage report (backend/coverage/index.html)
```

### Code Quality
```bash
make lint                # Check code style with ESLint
make lint-fix            # Automatically fix code style issues
```

### Database Management
```bash
make docker-up           # Start PostgreSQL and Redis containers (ports 5433 and 6380)
make docker-down         # Stop database containers
make docker-clean        # Remove containers and volume data
make db-migrate          # Run database migrations
make db-rollback         # Rollback database migrations
make db-seed             # Seed database with sample data
```

### Cleanup
```bash
make clean               # Clean build files and dependencies
make shutdown-dev        # Stop all development environment services
```

## Architecture

For a visual overview of the project structure, see [doc/architecture.md](doc/architecture.md).

### Python Backend (`/python_backend/`)

A complete Python backend implementation using FastAPI is available in `python_backend/`.

**Technology Stack:**
- **Web Framework**: FastAPI
- **ORM**: SQLAlchemy 2.0 + asyncpg
- **Cache**: Redis + redis.asyncio
- **Task Queue**: Celery + Redis
- **Authentication**: PyJWT (python-jose)
- **Validation**: Pydantic 2
- **Real-time**: python-socketio

**Project Structure:**
- `app/main.py` - FastAPI application entry point
- `app/core/` - Configuration, database, redis, security, logging
- `app/api/routes/` - API route definitions
- `app/models/` - SQLAlchemy ORM models
- `app/schemas/` - Pydantic schemas for validation
- `app/services/` - Business logic services
- `app/tasks/` - Celery tasks for async operations
- `app/websocket/` - WebSocket connection management
- `tests/` - Unit and integration tests

**Documentation:**
- See [doc/python_refactoring_plan.md](doc/python_refactoring_plan.md) for the complete refactoring plan
- See [python_backend/README.md](python_backend/README.md) for setup and usage

### Node.js Backend (`/backend/src/`)
- `server.ts` - Application entry point with Socket.io initialization
- `config/` - Database, Redis, and migration configuration
- `controllers/` - Request handlers
- `services/` - Business logic (DatabaseOptimizationService, MonitoringService, PKBattleService, etc.)
- `models/` - Data models and interfaces
- `routes/` - API route definitions (auth, users, chat, practice, vocabulary, pk, payment, admin, tasks, etc.)
- `middleware/` - Express middleware (error handling, security, performance monitoring)
- `types/` - TypeScript type definitions
- `utils/` - Utility functions and logger
- `database/` - Migration files and seed data

### Frontend Structure (`/frontend/src/`)
- `App.tsx` - Root component with theme management and routing
- `components/` - Reusable React components (Layout, Auth, common UI)
- `pages/` - Page components (Dashboard, Chat, Practice, Vocabulary, PKArena, etc.)
- `services/` - API service layer for backend communication
- `store/` - Redux state management (slices, store configuration)
- `types/` - TypeScript type definitions
- `utils/` - Utility functions including security utilities
- `theme/` - Material-UI theme configuration (light/dark modes)

### Key Services and Patterns
1. **Socket.io Integration**: Real-time communication for chat and PK battles
2. **Task Queue System**: Bull-based queue management for background tasks (requires Redis)
3. **Database Optimization**: Connection pooling and query optimization
4. **Performance Monitoring**: Built-in monitoring middleware
5. **Security Middleware**: Rate limiting, request validation, IP security checks
6. **Error Handling**: Global error handlers with structured error responses

### Database Schema
Managed through migrations in `backend/database/migrations/`. Use `make db-migrate` to apply migrations. The database uses PostgreSQL with connection pooling configured in `backend/src/config/database.ts`.

## Development Workflow

### Environment Setup
1. Ensure Node.js ≥ 18, npm ≥ 8, Docker, and Docker Compose are installed
2. Run `make setup-dev` to initialize the complete development environment
3. Create `.env` files (see Environment Variables section below)
4. Start services: `make docker-up` then `make dev` (backend) and `cd frontend && npm start` (frontend)

### Adding New Features
1. Create database migrations in `backend/database/migrations/` (format: `NNN_description.sql`)
2. Create or update models in `backend/src/models/`
3. Add service logic in `backend/src/services/`
4. Create controllers in `backend/src/controllers/`
5. Define routes in `backend/src/routes/`
6. Add corresponding frontend components in `frontend/src/pages/` or `frontend/src/components/`
7. Update Redux store if needed in `frontend/src/store/`

### Testing Strategy
- **Unit Tests**: Located in `backend/src/test/unit/` - test individual functions and classes
- **Integration Tests**: Located in `backend/src/test/integration/` - test API endpoints with database
- **Property Tests**: Located in `backend/src/test/property/` - use fast-check for property-based testing
- **Frontend Tests**: Use React Testing Library (run via `npm test` in frontend directory)

### Code Style
- TypeScript with strict type checking
- ESLint configuration extends `@typescript-eslint/recommended`
- Backend linting: `npm run lint` in backend directory
- Frontend linting: `npm run lint` in frontend directory
- Automatic fixing available via `make lint-fix` (backend) or `npm run lint:fix` (frontend)

## Environment Variables

### Root `.env` (for Docker Compose)
```bash
POSTGRES_DB=ai_language_learning
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
```

### Backend `.env` (`/backend/.env`)
```bash
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://postgres:password@localhost:5433/ai_language_learning
REDIS_URL=redis://localhost:6380
JWT_SECRET=your_secret_key_here
OPENROUTER_API_KEY=your_api_key_here
CORS_ORIGIN=http://localhost:3000
DB_HOST=localhost
DB_PORT=5433
DB_NAME=ai_language_learning
DB_USER=postgres
DB_PASSWORD=password
```

### Frontend `.env` (`/frontend/.env`)
```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_SOCKET_URL=http://localhost:8000
```

## Important Notes

### Port Configuration
- **Backend API**: 8000 (set via `PORT` environment variable, defaults to 3001 if not set)
- **Frontend Development**: 3000
- **PostgreSQL**: 5433 (mapped from container port 5432)
- **Redis**: 6380 (mapped from container port 6379)

### Database Connections
- Development database uses port 5433 to avoid conflicts with local PostgreSQL
- Connection pool configured with max 20 clients and 30-second idle timeout
- Migrations are run via `npm run migrate:up` in the backend directory

### Real-time Features
- Socket.io server initialized in `server.ts` with CORS configuration
- PK battle service handles real-time competition events
- Chat functionality uses Socket.io rooms for private conversations

### Security Considerations
- JWT authentication with refresh token support
- Rate limiting per endpoint type (auth, api, admin)
- Helmet.js for security headers
- Input validation via express-validator
- Sensitive data encryption in frontend storage

### Testing Environment
- Separate Docker Compose configuration in `docker-compose.test.yml`
- Test containers use the same host ports (5433, 6380) but different container names to avoid conflicts with development containers
- Integration tests automatically start test containers via `npm run test:db:setup`

### Troubleshooting
- If database connections fail, ensure Docker containers are running: `make docker-up`
- If ports are occupied, check `lsof -i :8000` (backend) or `lsof -i :3000` (frontend)
- If migrations fail, ensure database is accessible and `.env` variables are correct
- If Redis-dependent features fail, check Redis connection: `redis-cli -p 6380 ping`

## API Structure

All API routes are prefixed with `/api/`:
- `GET /health` - Health check with performance metrics
- `/api/auth` - Authentication (register, login, refresh)
- `/api/users` - User management
- `/api/chat` - Chat message handling
- `/api/practice` - Learning exercises
- `/api/vocabulary` - Word lists and management
- `/api/pk` - PK battle functionality
- `/api/payment` - Payment processing
- `/api/admin` - Administrative functions
- `/api/tasks` - Background task management
- `/api/daily-recommendations` - Personalized learning recommendations
- `/api/monitoring` - System monitoring endpoints
- `/api/user-languages` - User language proficiency tracking
- `/api/assessment` - Testing and assessment

Refer to individual route files in `backend/src/routes/` for detailed endpoint documentation.
