# Aleator Development Guide

## Quick Start

```bash
# 1. Copy environment file
cp .env.example .env.dev

# 2. Start development environment
make dev

# Backend only (for frontend development)
make dev-backend

# Frontend only (assumes backend is running)
make dev-frontend
```

## Environment Configuration

- `.env.dev` - Development environment variables
- `.env.prod` - Production environment variables (remember to update secrets!)
- `.env.example` - Template with all required variables

Docker Compose automatically loads the correct env file:
- `docker-compose.dev.yml` uses `.env.dev`
- `docker-compose.yml` uses `.env.prod`

## Common Development Tasks

### Database Management
```bash
make db              # Connect to database
make db-shell        # Access database shell
make reset-db        # Reset database (removes all data)
```

### Code Quality
```bash
make lint            # Run all linters
make format          # Format all code
make test            # Run all tests
make check           # Run linters and tests
```

### Debugging
```bash
make logs            # View all logs
make logs-backend    # View backend logs only
make logs-db         # View database logs only
make shell           # Access backend shell
make status          # Check service status
```

### Quick Commands
```bash
make restart         # Restart backend service
make clean           # Clean up Docker resources
```

## Development Workflow

1. **Making Changes**
   - Backend changes auto-reload via uvicorn
   - Frontend changes auto-reload via Vite
   - Database schema changes require `make reset-db`

2. **Before Committing**
   - Run `make check` to ensure code quality
   - Test your changes thoroughly

3. **Common Issues**
   - Port conflicts: Check if services are already running
   - Database connection: Ensure postgres is healthy before starting backend
   - API trailing slashes: FastAPI redirects without them

## Tips

- Use `make help` to see all available commands
- Database is persisted in Docker volumes
- Virtual environment files are excluded from Docker mounts
- Frontend runs on port 5173, backend on 8000, database on 5432