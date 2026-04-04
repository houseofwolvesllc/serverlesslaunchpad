# Serverless Launchpad Development Makefile
.PHONY: help local-start local-stop local-restart local-reset local-status local-ports test-local clean moto-logs cognito-logs moto-health moto-services

# BEGIN:SCAFFOLDING_REMOVE
# Default web frontend(s) to start: all, mantine, shadcn, daisyui, svelte, or none
web ?= all
# END:SCAFFOLDING_REMOVE

# BEGIN:SCAFFOLDING_INSERT
# -include .env
# export
# POSTGRES_PORT ?= 5432
# API_PORT ?= 3001
# WEB_PORT ?= 5173
# MOTO_PORT ?= 5555
# COGNITO_PORT ?= 9230
# END:SCAFFOLDING_INSERT

# Map env= shorthand to full environment names
env ?=
ifeq ($(env),dev)
  MAPPED_ENV := development
else ifeq ($(env),prod)
  MAPPED_ENV := production
else
  MAPPED_ENV := $(env)
endif

# Default target
help:
	@echo "Serverless Launchpad Development Commands"
	@echo "=========================================="
	@echo ""
	@echo "Local Development:"
	# BEGIN:SCAFFOLDING_REMOVE
	@echo "  make local-start              - Docker Compose full stack + all web frontends"
	@echo "  make local-start web=mantine  - Docker Compose full stack + Mantine only"
	@echo "  make local-start web=shadcn   - Docker Compose full stack + shadcn only"
	@echo "  make local-start web=daisyui  - Docker Compose full stack + DaisyUI only"
	@echo "  make local-start web=svelte   - Docker Compose full stack + Svelte only"
	@echo "  make local-start web=none     - Docker Compose full stack (no frontend)"
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @echo "  make local-start              - Docker Compose full stack (Postgres, Moto, API, Web)"
	# END:SCAFFOLDING_INSERT
	@echo "  make local-start env=dev      - API+Web against AWS development"
	@echo "  make local-start env=staging  - API+Web against AWS staging"
	@echo "  make local-start env=prod     - API+Web against AWS production (with safety prompt)"
	@echo "  make local-stop               - Stop all services"
	@echo "  make local-restart            - Restart all services"
	@echo "  make local-reset              - Reset Docker data and restart"
	@echo "  make local-status             - Check status of all services"
	# BEGIN:SCAFFOLDING_INSERT
	# @echo "  make local-ports              - Show configured port mappings"
	# END:SCAFFOLDING_INSERT
	@echo ""
	@echo "Logs:"
	@echo "  make moto-logs                - View Moto init script logs"
	@echo "  make cognito-logs             - View Cognito-Local container logs"
	@echo ""
	@echo "Testing:"
	@echo "  make test-local               - Run tests against local services"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean                    - Clean up all containers and data"
	@echo "  make moto-health              - Check Moto health"
	@echo "  make moto-services            - List Moto services"
	@echo ""

# ============================================
# local-start: start the local development environment
#
#   env=         (default) Docker Compose full stack with Moto
#   env=dev      Tunneled to AWS development
#   env=staging  Tunneled to AWS staging
#   env=prod     Tunneled to AWS production (with safety prompt)
# ============================================
local-start:
ifeq ($(env),)
	@if ! docker version >/dev/null 2>&1; then \
		echo "❌ ERROR: Docker is not running or not available!"; \
		echo ""; \
		echo "Please start Docker Desktop and try again."; \
		echo "You can start Docker by running: open -a Docker"; \
		echo ""; \
		exit 1; \
	fi
	@echo "✅ Docker is available"
	@echo ""
	@echo "🛑 Ensuring clean environment..."
	@$(MAKE) local-stop
	@sleep 1
	@# Stop any container using our ports (from other projects)
	# BEGIN:SCAFFOLDING_REMOVE
	@docker ps -q --filter "publish=5555" | xargs docker stop 2>/dev/null || true
	@docker ps -q --filter "publish=9230" | xargs docker stop 2>/dev/null || true
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @docker ps -q --filter "publish=$(MOTO_PORT)" | xargs docker stop 2>/dev/null || true
	# @docker ps -q --filter "publish=$(COGNITO_PORT)" | xargs docker stop 2>/dev/null || true
	# END:SCAFFOLDING_INSERT
	@echo ""
	@mkdir -p logs
	@echo "🚀 Starting local services..."
	@docker compose -f docker-compose.local.yml up -d > logs/moto.log 2>&1
	@echo "⏳ Waiting for local services to be ready..."
	# BEGIN:SCAFFOLDING_REMOVE
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if curl -s http://localhost:5555/moto-api/reset >/dev/null 2>&1; then \
			echo "✅ Local services are ready!"; \
			break; \
		fi; \
		echo "   Waiting... ($$i/10)"; \
		sleep 3; \
	done
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @for i in 1 2 3 4 5 6 7 8 9 10; do \
	# 	if curl -s http://localhost:$(MOTO_PORT)/moto-api/reset >/dev/null 2>&1; then \
	# 		echo "✅ Local services are ready!"; \
	# 		break; \
	# 	fi; \
	# 	echo "   Waiting... ($$i/10)"; \
	# 	sleep 3; \
	# done
	# END:SCAFFOLDING_INSERT
	@echo ""
	@echo "🔧 Running initialization scripts..."
	@./moto/init/01-cognito-local.sh 2>&1 | tee -a logs/moto.log
	@./moto/init/02-s3.sh >> logs/moto.log 2>&1
	@./moto/init/03-secrets.sh >> logs/moto.log 2>&1
	@./moto/init/04-generate-config.sh >> logs/moto.log 2>&1
	@./moto/init/05-dynamodb-tables.sh >> logs/moto.log 2>&1
	@echo ""
	@echo "🔧 Building workspace packages..."
	@cd types && npm run build || { echo "❌ Failed to build types"; exit 1; }
	@cd core && npm run build || { echo "❌ Failed to build core"; exit 1; }
	@cd framework && npm run build || { echo "❌ Failed to build framework"; exit 1; }
	# BEGIN:SCAFFOLDING_REMOVE
	@cd web.commons && npm run build || { echo "❌ Failed to build web.commons"; exit 1; }
	@cd web.commons.react && npm run build || { echo "❌ Failed to build web.commons.react"; exit 1; }
	# END:SCAFFOLDING_REMOVE
	@echo ""
	# BEGIN:SCAFFOLDING_REMOVE
	@echo "🚀 Starting development servers with file watching (web=$(web))..."
	@# Validate web argument
	@if [ "$(web)" != "all" ] && [ "$(web)" != "mantine" ] && [ "$(web)" != "shadcn" ] && [ "$(web)" != "daisyui" ] && [ "$(web)" != "svelte" ] && [ "$(web)" != "none" ]; then \
		echo "❌ Invalid web value: $(web)"; \
		echo "   Valid options: all, mantine, shadcn, daisyui, svelte, none"; \
		exit 1; \
	fi
	@# Start development servers based on web argument
	@if [ "$(web)" = "all" ]; then \
		npm run dev:watch; \
	elif [ "$(web)" = "mantine" ]; then \
		concurrently --kill-others-on-fail --prefix-colors cyan,magenta,yellow,green,blue,red --names "MANTINE,API,TYPES,CORE,FRAMEWORK,COGNITO" "npm run dev:web:mantine" "npm run dev:api" "npm run dev:watch:types" "npm run dev:watch:core" "npm run dev:watch:framework" "docker logs -f --since=10s serverlesslaunchpad-cognito-local 2>&1 | grep --line-buffered -v DEBUG"; \
	elif [ "$(web)" = "shadcn" ]; then \
		concurrently --kill-others-on-fail --prefix-colors teal,magenta,yellow,green,blue,red --names "SHADCN,API,TYPES,CORE,FRAMEWORK,COGNITO" "npm run dev:web:shadcn" "npm run dev:api" "npm run dev:watch:types" "npm run dev:watch:core" "npm run dev:watch:framework" "docker logs -f --since=10s serverlesslaunchpad-cognito-local 2>&1 | grep --line-buffered -v DEBUG"; \
	elif [ "$(web)" = "daisyui" ]; then \
		concurrently --kill-others-on-fail --prefix-colors green,magenta,yellow,orange,blue,red --names "DAISYUI,API,TYPES,CORE,FRAMEWORK,COGNITO" "npm run dev:web:daisyui" "npm run dev:api" "npm run dev:watch:types" "npm run dev:watch:core" "npm run dev:watch:framework" "docker logs -f --since=10s serverlesslaunchpad-cognito-local 2>&1 | grep --line-buffered -v DEBUG"; \
	elif [ "$(web)" = "svelte" ]; then \
		concurrently --kill-others-on-fail --prefix-colors blue,magenta,yellow,green,orange,red --names "SVELTE,API,TYPES,CORE,FRAMEWORK,COGNITO" "npm run dev:web:svelte" "npm run dev:api" "npm run dev:watch:types" "npm run dev:watch:core" "npm run dev:watch:framework" "docker logs -f --since=10s serverlesslaunchpad-cognito-local 2>&1 | grep --line-buffered -v DEBUG"; \
	elif [ "$(web)" = "none" ]; then \
		concurrently --kill-others-on-fail --prefix-colors magenta,yellow,green,blue,red --names "API,TYPES,CORE,FRAMEWORK,COGNITO" "npm run dev:api" "npm run dev:watch:types" "npm run dev:watch:core" "npm run dev:watch:framework" "docker logs -f --since=10s serverlesslaunchpad-cognito-local 2>&1 | grep --line-buffered -v DEBUG"; \
	fi
	@echo ""
	@echo "✨ Development environment is ready!"
	@echo ""
	@echo "  Moto:       http://localhost:5555"
	@echo "  API:        http://localhost:3001"
	@if [ "$(web)" = "all" ]; then \
		echo "  Mantine:    http://localhost:5173"; \
		echo "  shadcn:     http://localhost:5174"; \
		echo "  DaisyUI:    http://localhost:5175"; \
		echo "  Svelte:     http://localhost:5176"; \
	elif [ "$(web)" = "mantine" ]; then \
		echo "  Mantine:    http://localhost:5173"; \
	elif [ "$(web)" = "shadcn" ]; then \
		echo "  shadcn:     http://localhost:5174"; \
	elif [ "$(web)" = "daisyui" ]; then \
		echo "  DaisyUI:    http://localhost:5175"; \
	elif [ "$(web)" = "svelte" ]; then \
		echo "  Svelte:     http://localhost:5176"; \
	fi
	@echo ""
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @echo "🚀 Starting development servers..."
	# @npm run dev:watch
	# @echo ""
	# @echo "✨ Development environment is ready!"
	# @echo ""
	# @echo "  Moto:       http://localhost:$(MOTO_PORT)"
	# @echo "  Cognito:    http://localhost:$(COGNITO_PORT)"
	# @echo "  PostgreSQL: localhost:$(POSTGRES_PORT)"
	# @echo "  API:        http://localhost:$(API_PORT)"
	# @echo "  Web:        http://localhost:$(WEB_PORT)"
	# @echo ""
	# END:SCAFFOLDING_INSERT
	@echo "View logs: make moto-logs"
	@echo "Status:    make local-status"
else ifeq ($(env),prod)
	@echo ""
	@echo "⚠️  WARNING: You are about to start local servers against PRODUCTION AWS."
	@echo "   This will read/write real production data."
	@echo ""
	@read -p "Are you sure? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		$(MAKE) _tunnel-start ENV_NAME=production; \
	else \
		echo "Aborted."; \
	fi
else
	@$(MAKE) _tunnel-start ENV_NAME=$(MAPPED_ENV)
endif

# ============================================
# local-stop: stop the local development environment
#
#   env=         (default) Stop Docker Compose + dev servers
#   env=dev|etc  Kill bare processes by port only
# ============================================
local-stop:
ifeq ($(env),)
	@echo "🛑 Stopping services..."
	@echo "   Killing development processes..."
	@# Kill any process using our development ports
	# BEGIN:SCAFFOLDING_REMOVE
	@lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5174 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5175 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5176 | xargs kill -9 2>/dev/null || true
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @lsof -ti:$(API_PORT) | xargs kill -9 2>/dev/null || true
	# @lsof -ti:$(WEB_PORT) | xargs kill -9 2>/dev/null || true
	# END:SCAFFOLDING_INSERT
	@# Kill specific process patterns
	@pkill -f "concurrently.*WEB,API" 2>/dev/null || true
	@pkill -f "concurrently.*TYPES,CORE,FRAMEWORK" 2>/dev/null || true
	@pkill -f "tsx.*dev_server" 2>/dev/null || true
	@pkill -f "node.*dev_server" 2>/dev/null || true
	@pkill -f "vite" 2>/dev/null || true
	@pkill -f "npm run (local|dev)" 2>/dev/null || true
	@pkill -f "tsc.*--watch" 2>/dev/null || true
	@pkill -f "tsc-alias.*--watch" 2>/dev/null || true
	@# Clean up any stragglers
	@npm run dev:clean 2>/dev/null || true
	@echo "   ✓ Development servers stopped"
	@docker compose -f docker-compose.local.yml down 2>/dev/null || true
	@echo "   ✓ Local services stopped"
	@echo "✅ All services stopped"
else
	@echo "🛑 Stopping tunneled dev servers..."
	# BEGIN:SCAFFOLDING_REMOVE
	-@lsof -ti:3001 | xargs kill 2>/dev/null || true
	-@lsof -ti:5173 | xargs kill 2>/dev/null || true
	-@lsof -ti:5174 | xargs kill 2>/dev/null || true
	-@lsof -ti:5175 | xargs kill 2>/dev/null || true
	-@lsof -ti:5176 | xargs kill 2>/dev/null || true
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# -@lsof -ti:$(API_PORT) | xargs kill 2>/dev/null || true
	# -@lsof -ti:$(WEB_PORT) | xargs kill 2>/dev/null || true
	# END:SCAFFOLDING_INSERT
	@echo "✅ Stopped"
endif

# Restart all services
local-restart: local-stop local-start

# Reset Docker data and restart
local-reset:
	@echo "🔄 Resetting local data..."
	@docker compose -f docker-compose.local.yml down -v
	@mkdir -p logs
	@echo "✅ Local data reset"
	@echo ""
	@$(MAKE) local-start

# Check status of all services
local-status:
	@echo "📊 Service Status"
	@echo "=================="
	@echo ""
	# BEGIN:SCAFFOLDING_REMOVE
	@echo "Moto:"
	@if docker ps | grep -q serverlesslaunchpad-moto; then \
		echo "  ✅ Running"; \
		curl -s http://localhost:5555/moto-api/reset >/dev/null 2>&1 && echo "    Health: OK" || echo "    Health: Not responding"; \
	else \
		echo "  ❌ Not running"; \
	fi
	@echo ""
	@echo "API Server:"
	@if lsof -i :3001 >/dev/null 2>&1; then \
		echo "  ✅ Running on port 3001"; \
	else \
		echo "  ❌ Not running"; \
	fi
	@echo ""
	@echo "Mantine Web:"
	@if lsof -i :5173 >/dev/null 2>&1; then \
		echo "  ✅ Running on port 5173"; \
		curl -s http://localhost:5173 >/dev/null 2>&1 && echo "    Health: OK" || echo "    Health: Not responding"; \
	else \
		echo "  ❌ Not running"; \
	fi
	@echo ""
	@echo "shadcn Web:"
	@if lsof -i :5174 >/dev/null 2>&1; then \
		echo "  ✅ Running on port 5174"; \
		curl -s http://localhost:5174 >/dev/null 2>&1 && echo "    Health: OK" || echo "    Health: Not responding"; \
	else \
		echo "  ❌ Not running"; \
	fi
	@echo ""
	@echo "DaisyUI Web:"
	@if lsof -i :5175 >/dev/null 2>&1; then \
		echo "  ✅ Running on port 5175"; \
		curl -s http://localhost:5175 >/dev/null 2>&1 && echo "    Health: OK" || echo "    Health: Not responding"; \
	else \
		echo "  ❌ Not running"; \
	fi
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @echo "Moto:"
	# @if docker ps | grep -q $$(docker compose -f docker-compose.local.yml ps -q moto 2>/dev/null) 2>/dev/null; then \
	# 	echo "  ✅ Running on port $(MOTO_PORT)"; \
	# 	curl -s http://localhost:$(MOTO_PORT)/moto-api/reset >/dev/null 2>&1 && echo "    Health: OK" || echo "    Health: Not responding"; \
	# else \
	# 	echo "  ❌ Not running"; \
	# fi
	# @echo ""
	# @echo "PostgreSQL:"
	# @if docker ps | grep -q $$(docker compose -f docker-compose.local.yml ps -q postgres 2>/dev/null) 2>/dev/null; then \
	# 	echo "  ✅ Running on port $(POSTGRES_PORT)"; \
	# else \
	# 	echo "  ❌ Not running"; \
	# fi
	# @echo ""
	# @echo "API Server:"
	# @if lsof -i :$(API_PORT) >/dev/null 2>&1; then \
	# 	echo "  ✅ Running on port $(API_PORT)"; \
	# else \
	# 	echo "  ❌ Not running"; \
	# fi
	# @echo ""
	# @echo "Web Frontend:"
	# @if lsof -i :$(WEB_PORT) >/dev/null 2>&1; then \
	# 	echo "  ✅ Running on port $(WEB_PORT)"; \
	# 	curl -s http://localhost:$(WEB_PORT) >/dev/null 2>&1 && echo "    Health: OK" || echo "    Health: Not responding"; \
	# else \
	# 	echo "  ❌ Not running"; \
	# fi
	# END:SCAFFOLDING_INSERT

# BEGIN:SCAFFOLDING_INSERT
# # Show configured port mappings
# local-ports:
# 	@echo "📡 Local Development Port Mappings"
# 	@echo "==================================="
# 	@echo ""
# 	@echo "  PostgreSQL: localhost:$(POSTGRES_PORT)"
# 	@echo "  API:        http://localhost:$(API_PORT)"
# 	@echo "  Web:        http://localhost:$(WEB_PORT)"
# 	@echo "  Moto:       http://localhost:$(MOTO_PORT)"
# 	@echo "  Cognito:    http://localhost:$(COGNITO_PORT)"
# 	@echo ""
# 	@echo "Configured via .env (BASE_PORT=$(BASE_PORT))"
# END:SCAFFOLDING_INSERT

# Internal helper: start API + Web tunneled to a remote environment
# Usage: $(MAKE) _tunnel-start ENV_NAME=development
_tunnel-start:
	@echo "🔧 Building workspace packages..."
	@cd types && npm run build || { echo "❌ Failed to build types"; exit 1; }
	@cd core && npm run build || { echo "❌ Failed to build core"; exit 1; }
	@cd framework && npm run build || { echo "❌ Failed to build framework"; exit 1; }
	# BEGIN:SCAFFOLDING_REMOVE
	@cd web.commons && npm run build || { echo "❌ Failed to build web.commons"; exit 1; }
	@cd web.commons.react && npm run build || { echo "❌ Failed to build web.commons.react"; exit 1; }
	# END:SCAFFOLDING_REMOVE
	@echo ""
	@mkdir -p logs
	# BEGIN:SCAFFOLDING_REMOVE
	@echo "🚀 Starting tunneled servers (env=$(ENV_NAME), web=$(web))..."
	@cd api.hypermedia && npm run build && node dist/dev_server.js $(ENV_NAME) > ../logs/api-$(ENV_NAME).log 2>&1 &
	@if [ "$(web)" = "all" ]; then \
		cd web.mantine && VITE_APP_ENV=$(ENV_NAME) npx vite > ../logs/web-mantine-$(ENV_NAME).log 2>&1 & \
		cd web.shadcn && VITE_APP_ENV=$(ENV_NAME) npx vite > ../logs/web-shadcn-$(ENV_NAME).log 2>&1 & \
		cd web.daisyui && VITE_APP_ENV=$(ENV_NAME) npx vite > ../logs/web-daisyui-$(ENV_NAME).log 2>&1 & \
		cd web.svelte && VITE_APP_ENV=$(ENV_NAME) npx vite dev > ../logs/web-svelte-$(ENV_NAME).log 2>&1 &; \
	elif [ "$(web)" = "mantine" ]; then \
		cd web.mantine && VITE_APP_ENV=$(ENV_NAME) npx vite > ../logs/web-mantine-$(ENV_NAME).log 2>&1 &; \
	elif [ "$(web)" = "shadcn" ]; then \
		cd web.shadcn && VITE_APP_ENV=$(ENV_NAME) npx vite > ../logs/web-shadcn-$(ENV_NAME).log 2>&1 &; \
	elif [ "$(web)" = "daisyui" ]; then \
		cd web.daisyui && VITE_APP_ENV=$(ENV_NAME) npx vite > ../logs/web-daisyui-$(ENV_NAME).log 2>&1 &; \
	elif [ "$(web)" = "svelte" ]; then \
		cd web.svelte && VITE_APP_ENV=$(ENV_NAME) npx vite dev > ../logs/web-svelte-$(ENV_NAME).log 2>&1 &; \
	elif [ "$(web)" = "none" ]; then \
		echo "   (No web frontend started)"; \
	fi
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @echo "🚀 Starting tunneled servers (env=$(ENV_NAME))..."
	# @cd api.hypermedia && npm run build && node dist/dev_server.js $(ENV_NAME) > ../logs/api-$(ENV_NAME).log 2>&1 &
	# @cd web && VITE_APP_ENV=$(ENV_NAME) npx vite > ../logs/web-$(ENV_NAME).log 2>&1 &
	# END:SCAFFOLDING_INSERT
	@sleep 3
	@echo ""
	@echo "✨ Tunneled environment ready (Local → AWS $(ENV_NAME))!"
	@echo ""
	# BEGIN:SCAFFOLDING_REMOVE
	@echo "  API:        http://localhost:3001 → AWS $(ENV_NAME)"
	@if [ "$(web)" = "all" ]; then \
		echo "  Mantine:    http://localhost:5173 → AWS $(ENV_NAME)"; \
		echo "  shadcn:     http://localhost:5174 → AWS $(ENV_NAME)"; \
		echo "  DaisyUI:    http://localhost:5175 → AWS $(ENV_NAME)"; \
		echo "  Svelte:     http://localhost:5176 → AWS $(ENV_NAME)"; \
	elif [ "$(web)" = "mantine" ]; then \
		echo "  Mantine:    http://localhost:5173 → AWS $(ENV_NAME)"; \
	elif [ "$(web)" = "shadcn" ]; then \
		echo "  shadcn:     http://localhost:5174 → AWS $(ENV_NAME)"; \
	elif [ "$(web)" = "daisyui" ]; then \
		echo "  DaisyUI:    http://localhost:5175 → AWS $(ENV_NAME)"; \
	elif [ "$(web)" = "svelte" ]; then \
		echo "  Svelte:     http://localhost:5176 → AWS $(ENV_NAME)"; \
	fi
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @echo "  API:        http://localhost:$(API_PORT) → AWS $(ENV_NAME)"
	# @echo "  Web:        http://localhost:$(WEB_PORT) → AWS $(ENV_NAME)"
	# END:SCAFFOLDING_INSERT
	@echo ""

# Run tests against local services
test-local:
	@echo "🧪 Running tests against local services..."
	# BEGIN:SCAFFOLDING_REMOVE
	@export AWS_ENDPOINT_URL=http://localhost:5555 && \
	export NODE_ENV=test && \
	export AWS_ACCESS_KEY_ID=testing && \
	export AWS_SECRET_ACCESS_KEY=testing && \
	cd core && npm test && \
	cd ../framework && npm test && \
	cd ../api.hypermedia && npm test
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @export AWS_ENDPOINT_URL=http://localhost:$(MOTO_PORT) && \
	# export NODE_ENV=test && \
	# export AWS_ACCESS_KEY_ID=testing && \
	# export AWS_SECRET_ACCESS_KEY=testing && \
	# cd core && npm test && \
	# cd ../framework && npm test && \
	# cd ../api.hypermedia && npm test
	# END:SCAFFOLDING_INSERT

# Clean up all containers and data
clean:
	@echo "🧹 Cleaning up..."
	@$(MAKE) local-stop
	@docker compose -f docker-compose.local.yml down -v
	@rm -rf logs
	@echo "✅ Cleanup complete"

# View Moto init logs
moto-logs:
	@echo "📋 Moto init logs (Ctrl+C to exit):"
	@tail -f logs/moto.log

# View Cognito-Local container logs
cognito-logs:
	@echo "📋 Cognito-Local container logs (Ctrl+C to exit):"
	@docker logs -f serverlesslaunchpad-cognito-local

# Check Moto health
moto-health:
	@echo "🏥 Moto Health Check:"
	# BEGIN:SCAFFOLDING_REMOVE
	@curl -s http://localhost:5555/moto-api/reset >/dev/null 2>&1 && echo "✅ Moto is running and healthy" || echo "❌ Moto is not running"
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @curl -s http://localhost:$(MOTO_PORT)/moto-api/reset >/dev/null 2>&1 && echo "✅ Moto is running and healthy" || echo "❌ Moto is not running"
	# END:SCAFFOLDING_INSERT

# List Moto services
moto-services:
	@echo "📦 Moto Services:"
	@echo ""
	@echo "Cognito User Pools:"
	# BEGIN:SCAFFOLDING_REMOVE
	@export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-2 && \
	aws --endpoint-url=http://localhost:5555 --region us-west-2 cognito-idp list-user-pools --max-results 10 2>/dev/null | jq -r '.UserPools[] | "  - \(.Name) (ID: \(.Id))"' || echo "  No user pools found"
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-2 && \
	# aws --endpoint-url=http://localhost:$(MOTO_PORT) --region us-west-2 cognito-idp list-user-pools --max-results 10 2>/dev/null | jq -r '.UserPools[] | "  - \(.Name) (ID: \(.Id))"' || echo "  No user pools found"
	# END:SCAFFOLDING_INSERT
	@echo ""
	@echo "S3 Buckets:"
	# BEGIN:SCAFFOLDING_REMOVE
	@export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-2 && \
	aws --endpoint-url=http://localhost:5555 --region us-west-2 s3api list-buckets 2>/dev/null | jq -r '.Buckets[] | "  - \(.Name)"' || echo "  No buckets found"
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-2 && \
	# aws --endpoint-url=http://localhost:$(MOTO_PORT) --region us-west-2 s3api list-buckets 2>/dev/null | jq -r '.Buckets[] | "  - \(.Name)"' || echo "  No buckets found"
	# END:SCAFFOLDING_INSERT
	@echo ""
	@echo "Secrets:"
	# BEGIN:SCAFFOLDING_REMOVE
	@export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-2 && \
	aws --endpoint-url=http://localhost:5555 --region us-west-2 secretsmanager list-secrets 2>/dev/null | jq -r '.SecretList[] | "  - \(.Name)"' || echo "  No secrets found"
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-2 && \
	# aws --endpoint-url=http://localhost:$(MOTO_PORT) --region us-west-2 secretsmanager list-secrets 2>/dev/null | jq -r '.SecretList[] | "  - \(.Name)"' || echo "  No secrets found"
	# END:SCAFFOLDING_INSERT
	@echo ""
	@echo "SSM Parameters:"
	# BEGIN:SCAFFOLDING_REMOVE
	@export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-2 && \
	aws --endpoint-url=http://localhost:5555 --region us-west-2 ssm get-parameters-by-path --path /serverlesslaunchpad 2>/dev/null | jq -r '.Parameters[] | "  - \(.Name): \(.Value)"' || echo "  No parameters found"
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-2 && \
	# aws --endpoint-url=http://localhost:$(MOTO_PORT) --region us-west-2 ssm get-parameters-by-path --path /serverlesslaunchpad 2>/dev/null | jq -r '.Parameters[] | "  - \(.Name): \(.Value)"' || echo "  No parameters found"
	# END:SCAFFOLDING_INSERT

# Create logs directory if it doesn't exist
$(shell mkdir -p logs)
