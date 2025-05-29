.PHONY: help dev up down logs clean test frontend backend db migrate

# Default target
help: ## Show this help message
	@echo "Aleator Development Commands"
	@echo "=========================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development commands
dev: ## Start full development environment (backend + database + frontend dev server)
	@echo "🚀 Starting Aleator development environment..."
	@echo "📊 Backend API: http://localhost:8000"
	@echo "🎨 Frontend: http://localhost:5173"
	@echo "🗄️  Database: localhost:5432"
	@echo ""
	docker compose -f docker-compose.dev.yml up --build -d postgres backend
	@echo "⏳ Waiting for backend to be ready..."
	@timeout 30 bash -c 'until curl -s http://localhost:8000/docs > /dev/null; do sleep 1; done' || echo "⚠️  Backend might still be starting up"
	@echo "✅ Backend is ready! Starting frontend..."
	cd frontend && bun run dev

dev-backend: ## Start only backend + database for frontend development
	@echo "🚀 Starting backend services..."
	docker compose -f docker-compose.dev.yml up --build -d postgres backend
	@echo "📊 Backend API: http://localhost:8000"
	@echo "📖 API Docs: http://localhost:8000/docs"

dev-frontend: ## Start only frontend (assumes backend is running)
	@echo "🎨 Starting frontend development server..."
	cd frontend && bun run dev

# Production commands  
up: ## Start production environment
	@echo "🚀 Starting Aleator production environment..."
	docker compose up --build -d
	@echo "✅ Application started!"
	@echo "🌐 Frontend: http://localhost:3000"
	@echo "📊 Backend API: http://localhost:8000"

down: ## Stop all services and remove volumes
	@echo "🛑 Stopping all services and removing volumes..."
	docker compose -f docker-compose.dev.yml down -v 2>/dev/null || true
	docker compose down -v 2>/dev/null || true
	@echo "✅ All services stopped and volumes removed"

# Database commands
db: ## Connect to database (development)
	@echo "🗄️  Connecting to development database..."
	docker compose -f docker-compose.dev.yml exec postgres psql -U aleator -d aleator_dev

db-reset: ## Reset development database (removes all data)
	@echo "⚠️  Resetting development database..."
	docker compose -f docker-compose.dev.yml stop backend
	docker compose -f docker-compose.dev.yml rm -f postgres
	docker compose -f docker-compose.dev.yml up -d postgres
	@echo "⏳ Waiting for database to be ready..."
	@sleep 3
	docker compose -f docker-compose.dev.yml up -d backend
	@echo "✅ Database reset complete"

migrate: ## Run database migrations
	@echo "🔄 Running database migrations..."
	docker compose -f docker-compose.dev.yml exec backend alembic upgrade head

# Utility commands
logs: ## View logs from all services
	docker compose -f docker-compose.dev.yml logs -f

logs-backend: ## View backend logs only
	docker compose -f docker-compose.dev.yml logs -f backend

logs-db: ## View database logs only
	docker compose -f docker-compose.dev.yml logs -f postgres

clean: ## Clean up Docker resources
	@echo "🧹 Cleaning up Docker resources..."
	docker compose -f docker-compose.dev.yml down -v --remove-orphans
	docker compose down -v --remove-orphans
	docker system prune -f
	@echo "✅ Cleanup complete"

# Testing commands
test: ## Run backend tests
	@echo "🧪 Running backend tests..."
	cd backend && python -m pytest -v

test-watch: ## Run backend tests in watch mode
	@echo "🧪 Running backend tests in watch mode..."
	cd backend && python -m pytest -v --tb=short --looponfail

# Frontend commands
frontend-build: ## Build frontend for production
	@echo "🏗️  Building frontend..."
	cd frontend && bun run build

frontend-preview: ## Preview frontend build
	@echo "👀 Previewing frontend build..."
	cd frontend && bun run preview

frontend-lint: ## Lint frontend code
	@echo "🔍 Linting frontend code..."
	cd frontend && bun run lint

# Backend commands
backend-lint: ## Lint backend code  
	@echo "🔍 Linting backend code..."
	cd backend && ruff check .

backend-format: ## Format backend code
	@echo "✨ Formatting backend code..."
	cd backend && ruff format .

# Setup commands
install: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	@echo "Installing frontend dependencies..."
	cd frontend && bun install
	@echo "Installing backend dependencies..."
	cd backend && pip install -e ".[test]"
	@echo "✅ All dependencies installed"

# Quick status check
status: ## Check status of all services
	@echo "📊 Service Status:"
	@echo "=================="
	@if docker compose -f docker-compose.dev.yml ps --services --filter "status=running" | grep -q postgres; then \
		echo "🟢 Database: Running"; \
	else \
		echo "🔴 Database: Stopped"; \
	fi
	@if docker compose -f docker-compose.dev.yml ps --services --filter "status=running" | grep -q backend; then \
		echo "🟢 Backend: Running"; \
	else \
		echo "🔴 Backend: Stopped"; \
	fi
	@if curl -s http://localhost:5173 > /dev/null 2>&1; then \
		echo "🟢 Frontend: Running"; \
	else \
		echo "🔴 Frontend: Stopped"; \
	fi
