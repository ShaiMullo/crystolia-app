.PHONY: help dev up down logs clean rebuild

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🔧 Crystolia - Local Development Makefile
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

help: ## Show this help message
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🔧 Crystolia Local Development Commands"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

dev: ## Start all services (MongoDB + Backend + Frontend)
	@echo "🚀 Starting Crystolia local development environment..."
	docker-compose -f docker-compose.local.yml up --build

up: ## Start all services in detached mode
	@echo "🚀 Starting Crystolia (detached)..."
	docker-compose -f docker-compose.local.yml up -d --build
	@echo "✅ Services started!"
	@echo "   - Backend:        http://localhost:4000"
	@echo "   - Frontend Client: http://localhost:3000"
	@echo "   - Frontend Admin:  http://localhost:3001"
	@echo "   - MongoDB:        mongodb://localhost:27017/crystolia"

down: ## Stop all services
	@echo "🛑 Stopping Crystolia services..."
	docker-compose -f docker-compose.local.yml down
	@echo "✅ All services stopped"

logs: ## Follow logs for all services
	docker-compose -f docker-compose.local.yml logs -f

logs-backend: ## Follow backend logs only
	docker-compose -f docker-compose.local.yml logs -f backend

logs-frontend: ## Follow frontend-client logs only
	docker-compose -f docker-compose.local.yml logs -f frontend-client

logs-admin: ## Follow frontend-admin logs only
	docker-compose -f docker-compose.local.yml logs -f frontend-admin

logs-mongo: ## Follow MongoDB logs only
	docker-compose -f docker-compose.local.yml logs -f mongo

clean: ## Stop services and remove volumes (WARNING: deletes database)
	@echo "⚠️  WARNING: This will delete all MongoDB data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose -f docker-compose.local.yml down -v; \
		echo "✅ Services stopped and volumes removed"; \
	else \
		echo "❌ Cancelled"; \
	fi

rebuild: ## Rebuild all images (useful after dependency changes)
	@echo "🔨 Rebuilding all Docker images..."
	docker-compose -f docker-compose.local.yml build --no-cache
	@echo "✅ Rebuild complete"

ps: ## Show running containers
	docker-compose -f docker-compose.local.yml ps

shell-backend: ## Open shell in backend container
	docker-compose -f docker-compose.local.yml exec backend sh

shell-mongo: ## Open MongoDB shell
	docker-compose -f docker-compose.local.yml exec mongo mongosh crystolia

seed: ## Seed database with initial users
	@echo "🌱 Seeding database..."
	docker-compose -f docker-compose.local.yml exec backend npm run seed
	@echo "✅ Seeding complete"
