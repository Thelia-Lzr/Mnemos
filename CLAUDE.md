# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

Mnemos is a local, single-user AI language learning workspace with chat, practice, vocabulary, and assessments.

**Key Features:**
- AI-driven personalized learning recommendations
- AI chat and feedback over HTTP
- Progress tracking and analytics
- Recharge, credits, and transaction history
- Multiple question types and assessment system

**Technology Stack**

- **Frontend** uses TypeScript, React 18, Redux Toolkit, and Material UI.
- **Backend** uses Python, FastAPI, Pydantic, and Uvicorn.
- **Data** uses PostgreSQL, SQLAlchemy with asyncpg, and Alembic migrations.
- **Background jobs** use Celery with Redis. Docker Compose runs PostgreSQL and Redis for local development.

## Common Commands

Run `make help` from the repository root. Follow the [README](README.md#-快速开始) to initialize dependencies and configure the backend. For the `python_backend/.venv` layout, add `PYTHON_BIN=.venv/bin/python` to the root Make commands that invoke Python.

### Development
```bash
make dev                 # Start backend development server with hot reload (port 8000)
cd frontend && npm start # Start frontend development server (port 3000)
make start               # Start the FastAPI server without hot reload
```

### Building
```bash
make build               # Build both backend and frontend
make build-backend       # Check that Python backend code compiles
```

### Testing
```bash
make test                # Run the Python backend test suite
make test-unit           # Run unit tests only
make test-integration    # Run integration tests
make test-coverage       # Generate test coverage report (python_backend/htmlcov/index.html)
```

### Code Quality
```bash
make lint                # Check backend and frontend code style
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

See the [project architecture](README.md#-项目架构) for the request flow and service boundaries.

### Python Backend (`/python_backend/`)

The API runs from `python_backend/app/main.py` with Uvicorn.

**Technology Stack:**
- **Web Framework**: FastAPI
- **ORM**: SQLAlchemy 2.0 + asyncpg
- **Cache**: Redis + redis.asyncio
- **Task Queue**: Celery + Redis
- **Validation**: Pydantic 2

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
- See [python_backend/README.md](python_backend/README.md) for setup and usage

### Frontend Structure (`/frontend/src/`)
- `App.tsx` - Root component with theme management and routing
- `components/` - Reusable React components (layout and common UI)
- `pages/` - Page components (Dashboard, Chat, Practice, Vocabulary, PKArena, etc.)
- `services/` - API service layer for backend communication
- `store/` - Redux state management (slices, store configuration)
- `types/` - TypeScript type definitions
- `utils/` - Utility functions including security utilities
- `theme/` - Material-UI theme configuration (light/dark modes)

### Request Handling

The frontend calls `/api` through Axios. FastAPI routes resolve the local workspace profile and validate requests. HTTP and Celery use the persisted AI provider queues through `app.services.ai_service`. Celery worker and scheduler commands are defined in `python_backend/Makefile`.

### Database Schema

Maintain migrations in `python_backend/alembic/versions/`. Use `make db-migrate` to apply them. SQLAlchemy connection pooling is configured in `python_backend/app/core/database.py`.

## Development Workflow

- Follow the [environment setup](README.md#-快速开始), then run the FastAPI and React development servers in separate terminals.
- Update SQLAlchemy models, Pydantic schemas, services, and routes in `python_backend/app/` as needed. Put new schema migrations in `python_backend/alembic/versions/`.
- Put frontend pages and shared components in `frontend/src/pages/` and `frontend/src/components/`. Keep HTTP calls in `frontend/src/services/`.
- Run pytest for the backend and the React test command in `frontend/` for the frontend. Use `docker-compose.test.yml` for integration tests.
- Use Ruff and Black for Python, and ESLint for TypeScript.

## Environment Variables

- Backend settings are read from `python_backend/.env`. See [the example](python_backend/.env.example) for database, Redis and CORS settings. Configure AI providers and feature queues from the AI settings page.
- Override the frontend API address through `REACT_APP_API_URL` in `frontend/.env`. The default is `http://localhost:8000/api`.
- Local ports are 3000 for React, 8000 for FastAPI, 5433 for PostgreSQL, and 6380 for Redis.

## API Structure

Business routes are prefixed with `/api/`. FastAPI also exposes `/docs` and `/openapi.json`.
- `GET /health` - Database and Redis health check
- `/api/ai-settings` - Provider configuration and ordered fallback queues
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

Refer to individual route files in `python_backend/app/api/routes/` for detailed endpoint documentation.
