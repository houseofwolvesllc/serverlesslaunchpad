# Serverless Launchpad Development Makefile
.PHONY: help dev-start dev-stop dev-reset dev-status test-local clean

# BEGIN:SCAFFOLDING_REMOVE
# Default web frontend(s) to start: all, mantine, shadcn, daisyui, or none
web ?= all
# END:SCAFFOLDING_REMOVE

# BEGIN:SCAFFOLDING_INSERT
# WEB_DIR = web
# END:SCAFFOLDING_INSERT

# Default target
help:
	@echo "Serverless Launchpad Development Commands"
	@echo "=========================================="
	@echo ""
	@echo "Development Environment:"
	# BEGIN:SCAFFOLDING_REMOVE
	@echo "  make dev-start              - Start Moto and all web frontends (default)"
	@echo "  make dev-start web=all      - Start Moto and all frontends (explicit)"
	@echo "  make dev-start web=mantine  - Start Moto and Mantine frontend only"
	@echo "  make dev-start web=shadcn   - Start Moto and shadcn frontend only"
	@echo "  make dev-start web=daisyui  - Start Moto and DaisyUI frontend only"
	@echo "  make dev-start web=none     - Start Moto only (infrastructure only)"
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @echo "  make dev-start              - Start Moto and development servers"
	# END:SCAFFOLDING_INSERT
	@echo "  make dev-stop               - Stop all services"
	@echo "  make dev-restart            - Restart all services"
	@echo "  make dev-reset              - Reset Moto data and restart"
	@echo "  make moto-logs              - View Moto init script logs"
	@echo "  make cognito-logs           - View Cognito-Local container logs"
	@echo "  make dev-status             - Check status of all services"
	@echo ""
	@echo "Cloud Environments:"
	@echo "  make cloud-dev    - Run locally against AWS development environment"
	@echo "  make cloud-staging - Run locally against AWS staging environment"
	@echo ""
	@echo "Testing:"
	@echo "  make test-local   - Run tests against Moto"
	@echo "  make test-auth    - Test authentication flow"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean        - Clean up all containers and data"
	@echo "  make moto-health  - Check Moto health"
	@echo "  make moto-services - List Moto services"
	@echo ""

# Start development environment
dev-start:
	@echo "🔍 Checking Docker availability..."
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
	@$(MAKE) dev-stop 2>/dev/null || true
	@echo ""
	@mkdir -p logs
	@echo "🚀 Starting Moto..."
	@docker-compose -f docker-compose.moto.yml up -d > logs/moto.log 2>&1
	@echo "⏳ Waiting for Moto to be ready..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if curl -s http://localhost:5555/moto-api/reset >/dev/null 2>&1; then \
			echo "✅ Moto is ready!"; \
			break; \
		fi; \
		echo "   Waiting... ($$i/10)"; \
		sleep 3; \
	done
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
	# @echo "  Moto:       http://localhost:5555"
	# @echo "  API:        http://localhost:3001"
	# @echo "  Web:        http://localhost:5173"
	# @echo ""
	# END:SCAFFOLDING_INSERT
	@echo "View Moto logs with: make moto-logs"
	@echo "Check status with: make dev-status"

# Stop all services
dev-stop:
	@echo "🛑 Stopping services..."
	@echo "   Killing development processes..."
	@# Kill any process using our development ports (except Docker on 5555)
	@lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5174 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5175 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5176 | xargs kill -9 2>/dev/null || true
	@# Kill specific process patterns
	@pkill -f "concurrently.*WEB,API" 2>/dev/null || true
	@pkill -f "concurrently.*TYPES,CORE,FRAMEWORK" 2>/dev/null || true
	@pkill -f "tsx.*dev_server" 2>/dev/null || true
	@pkill -f "node.*dev_server" 2>/dev/null || true
	@pkill -f "vite.*--mode" 2>/dev/null || true
	@pkill -f "npm run (local|dev)" 2>/dev/null || true
	@pkill -f "tsc.*--watch" 2>/dev/null || true
	@pkill -f "tsc-alias.*--watch" 2>/dev/null || true
	@# Clean up any stragglers
	@npm run dev:clean 2>/dev/null || true
	@echo "   ✓ Development servers stopped"
	@docker-compose -f docker-compose.moto.yml stop 2>/dev/null || true
	@echo "   ✓ Moto stopped"
	@echo "✅ All services stopped"

# Restart all services
dev-restart: dev-stop dev-start

# Reset Moto data and restart
dev-reset:
	@echo "🔄 Resetting Moto data..."
	@docker-compose -f docker-compose.moto.yml down -v
	@mkdir -p logs
	@echo "✅ Moto data reset"
	@echo ""
	@$(MAKE) dev-start

# View Moto logs
moto-logs:
	@echo "📋 Moto logs (Ctrl+C to exit):"
	@tail -f logs/moto.log

# View Cognito-Local container logs
cognito-logs:
	@echo "📋 Cognito-Local container logs (Ctrl+C to exit):"
	@docker logs -f serverlesslaunchpad-cognito-local

# Check status of all services
dev-status:
	@echo "📊 Service Status"
	@echo "=================="
	@echo ""
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
	# BEGIN:SCAFFOLDING_REMOVE
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
	# @echo ""
	# @echo "Web Frontend:"
	# @if lsof -i :5173 >/dev/null 2>&1; then \
	# 	echo "  ✅ Running on port 5173"; \
	# 	curl -s http://localhost:5173 >/dev/null 2>&1 && echo "    Health: OK" || echo "    Health: Not responding"; \
	# else \
	# 	echo "  ❌ Not running"; \
	# fi
	# END:SCAFFOLDING_INSERT

# Run tests against Moto
test-local:
	@echo "🧪 Running tests against Moto..."
	@export AWS_ENDPOINT_URL=http://localhost:5555 && \
	export NODE_ENV=test && \
	export AWS_ACCESS_KEY_ID=testing && \
	export AWS_SECRET_ACCESS_KEY=testing && \
	cd core && npm test && \
	cd ../framework && npm test && \
	cd ../api.hypermedia && npm test

# Clean up all containers and data
clean:
	@echo "🧹 Cleaning up..."
	@$(MAKE) dev-stop
	@docker-compose -f docker-compose.moto.yml down -v
	@rm -rf logs
	@echo "✅ Cleanup complete"

# Check Moto health
moto-health:
	@echo "🏥 Moto Health Check:"
	@curl -s http://localhost:5555/moto-api/reset >/dev/null 2>&1 && echo "✅ Moto is running and healthy" || echo "❌ Moto is not running"

# List Moto services
moto-services:
	@echo "📦 Moto Services:"
	@echo ""
	@echo "Cognito User Pools:"
	@export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-2 && \
	aws --endpoint-url=http://localhost:5555 --region us-west-2 cognito-idp list-user-pools --max-results 10 2>/dev/null | jq -r '.UserPools[] | "  - \(.Name) (ID: \(.Id))"' || echo "  No user pools found"
	@echo ""
	@echo "S3 Buckets:"
	@export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-2 && \
	aws --endpoint-url=http://localhost:5555 --region us-west-2 s3api list-buckets 2>/dev/null | jq -r '.Buckets[] | "  - \(.Name)"' || echo "  No buckets found"
	@echo ""
	@echo "Secrets:"
	@export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-2 && \
	aws --endpoint-url=http://localhost:5555 --region us-west-2 secretsmanager list-secrets 2>/dev/null | jq -r '.SecretList[] | "  - \(.Name)"' || echo "  No secrets found"
	@echo ""
	@echo "SSM Parameters:"
	@export AWS_ACCESS_KEY_ID=testing AWS_SECRET_ACCESS_KEY=testing AWS_DEFAULT_REGION=us-west-2 && \
	aws --endpoint-url=http://localhost:5555 --region us-west-2 ssm get-parameters-by-path --path /serverlesslaunchpad 2>/dev/null | jq -r '.Parameters[] | "  - \(.Name): \(.Value)"' || echo "  No parameters found"

# Cloud environment commands
cloud-dev:
	# BEGIN:SCAFFOLDING_REMOVE
	@echo "☁️  Starting development environment (Local → AWS Development, web=$(web))"
	@mkdir -p logs
	@echo "🚀 Starting development servers (AWS development environment)..."
	@cd api.hypermedia && npm run local development > ../logs/api-dev.log 2>&1 &
	@if [ "$(web)" = "all" ]; then \
		cd mantine.web && npm run local:development > ../logs/web-mantine-dev.log 2>&1 & \
		cd shadcn.web && npm run local:development > ../logs/web-shadcn-dev.log 2>&1 & \
		cd daisyui.web && npm run local:development > ../logs/web-daisyui-dev.log 2>&1 &; \
	elif [ "$(web)" = "mantine" ]; then \
		cd mantine.web && npm run local:development > ../logs/web-mantine-dev.log 2>&1 &; \
	elif [ "$(web)" = "shadcn" ]; then \
		cd shadcn.web && npm run local:development > ../logs/web-shadcn-dev.log 2>&1 &; \
	elif [ "$(web)" = "daisyui" ]; then \
		cd daisyui.web && npm run local:development > ../logs/web-daisyui-dev.log 2>&1 &; \
	fi
	@sleep 3
	@echo "   Development servers started"
	@echo ""
	@echo "✨ Development environment ready (Local → AWS Development)!"
	@echo ""
	@echo "  API:        http://localhost:3001 → AWS Development"
	@if [ "$(web)" = "all" ]; then \
		echo "  Mantine:    http://localhost:5173 → AWS Development"; \
		echo "  shadcn:     http://localhost:5174 → AWS Development"; \
		echo "  DaisyUI:    http://localhost:5175 → AWS Development"; \
	elif [ "$(web)" = "mantine" ]; then \
		echo "  Mantine:    http://localhost:5173 → AWS Development"; \
	elif [ "$(web)" = "shadcn" ]; then \
		echo "  shadcn:     http://localhost:5174 → AWS Development"; \
	elif [ "$(web)" = "daisyui" ]; then \
		echo "  DaisyUI:    http://localhost:5175 → AWS Development"; \
	fi
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @echo "☁️  Starting development environment (Local → AWS Development)"
	# @mkdir -p logs
	# @echo "🚀 Starting development servers (AWS development environment)..."
	# @cd api.hypermedia && npm run local development > ../logs/api-dev.log 2>&1 &
	# @echo "  Web:        http://localhost:5173"
	# @sleep 3
	# @echo "   Development servers started"
	# @echo ""
	# @echo "✨ Development environment ready (Local → AWS Development)!"
	# @echo ""
	# @echo "  API:        http://localhost:3001 → AWS Development"
	# @echo "  Web:        http://localhost:5173"
	# END:SCAFFOLDING_INSERT

cloud-staging:
	# BEGIN:SCAFFOLDING_REMOVE
	@echo "☁️  Starting staging environment (Local → AWS Staging, web=$(web))"
	@mkdir -p logs
	@echo "🚀 Starting development servers (AWS staging environment)..."
	@cd api.hypermedia && npm run local staging > ../logs/api-staging.log 2>&1 &
	@if [ "$(web)" = "all" ]; then \
		cd mantine.web && npm run local:staging > ../logs/web-mantine-staging.log 2>&1 & \
		cd shadcn.web && npm run local:staging > ../logs/web-shadcn-staging.log 2>&1 & \
		cd daisyui.web && npm run local:staging > ../logs/web-daisyui-staging.log 2>&1 &; \
	elif [ "$(web)" = "mantine" ]; then \
		cd mantine.web && npm run local:staging > ../logs/web-mantine-staging.log 2>&1 &; \
	elif [ "$(web)" = "shadcn" ]; then \
		cd shadcn.web && npm run local:staging > ../logs/web-shadcn-staging.log 2>&1 &; \
	elif [ "$(web)" = "daisyui" ]; then \
		cd daisyui.web && npm run local:staging > ../logs/web-daisyui-staging.log 2>&1 &; \
	fi
	@sleep 3
	@echo "   Development servers started"
	@echo ""
	@echo "✨ Staging environment ready (Local → AWS Staging)!"
	@echo ""
	@echo "  API:        http://localhost:3001 → AWS Staging"
	@if [ "$(web)" = "all" ]; then \
		echo "  Mantine:    http://localhost:5173 → AWS Staging"; \
		echo "  shadcn:     http://localhost:5174 → AWS Staging"; \
		echo "  DaisyUI:    http://localhost:5175 → AWS Staging"; \
	elif [ "$(web)" = "mantine" ]; then \
		echo "  Mantine:    http://localhost:5173 → AWS Staging"; \
	elif [ "$(web)" = "shadcn" ]; then \
		echo "  shadcn:     http://localhost:5174 → AWS Staging"; \
	elif [ "$(web)" = "daisyui" ]; then \
		echo "  DaisyUI:    http://localhost:5175 → AWS Staging"; \
	fi
	# END:SCAFFOLDING_REMOVE
	# BEGIN:SCAFFOLDING_INSERT
	# @echo "☁️  Starting staging environment (Local → AWS Staging)"
	# @mkdir -p logs
	# @echo "🚀 Starting development servers (AWS staging environment)..."
	# @cd api.hypermedia && npm run local staging > ../logs/api-staging.log 2>&1 &
	# @echo "  Web:        http://localhost:5173"
	# @sleep 3
	# @echo "   Development servers started"
	# @echo ""
	# @echo "✨ Staging environment ready (Local → AWS Staging)!"
	# @echo ""
	# @echo "  API:        http://localhost:3001 → AWS Staging"
	# @echo "  Web:        http://localhost:5173"
	# END:SCAFFOLDING_INSERT

# Create logs directory if it doesn't exist
$(shell mkdir -p logs)