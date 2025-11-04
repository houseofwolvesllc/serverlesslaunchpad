# Serverless Launchpad Development Makefile
.PHONY: help dev-start dev-stop dev-reset dev-status test-local clean

# Default target
help:
	@echo "Serverless Launchpad Development Commands"
	@echo "=========================================="
	@echo ""
	@echo "Development Environment:"
	@echo "  make dev-start    - Start Moto and local development servers"
	@echo "  make dev-stop     - Stop all services"
	@echo "  make dev-restart  - Restart all services"
	@echo "  make dev-reset    - Reset Moto data and restart"
	@echo "  make moto-logs    - View Moto logs"
	@echo "  make dev-status   - Check status of all services"
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
	@./moto/init/01-cognito-local.sh >> logs/moto.log 2>&1
	@./moto/init/02-s3.sh >> logs/moto.log 2>&1
	@./moto/init/03-secrets.sh >> logs/moto.log 2>&1
	@./moto/init/04-generate-config.sh >> logs/moto.log 2>&1
	@./moto/init/05-dynamodb-tables.sh >> logs/moto.log 2>&1
	@echo ""
	@echo "🔧 Building workspace packages..."
	@cd core && npm run build >/dev/null 2>&1
	@cd framework && npm run build >/dev/null 2>&1
	@cd types && npm run build >/dev/null 2>&1
	@echo ""
	@echo "🚀 Starting development servers with file watching..."
	@npm run dev:watch
	@echo ""
	@echo "✨ Development environment is ready!"
	@echo ""
	@echo "  Moto:       http://localhost:5555"
	@echo "  API:        http://localhost:3001"
	@echo "  Web:        http://localhost:5173"
	@echo ""
	@echo "View Moto logs with: make moto-logs"
	@echo "Check status with: make dev-status"

# Stop all services
dev-stop:
	@echo "🛑 Stopping services..."
	@echo "   Killing development processes..."
	@# Kill any process using our development ports (except Docker on 5555)
	@lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
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
	@echo ""
	@echo "Web Server:"
	@if lsof -i :5173 >/dev/null 2>&1; then \
		echo "  ✅ Running on port 5173"; \
		curl -s http://localhost:5173 >/dev/null 2>&1 && echo "    Health: OK" || echo "    Health: Not responding"; \
	else \
		echo "  ❌ Not running"; \
	fi

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
	@echo "☁️  Starting development environment (Local → AWS Development)"
	@mkdir -p logs
	@echo "🚀 Starting development servers (AWS development environment)..."
	@cd api.hypermedia && npm run local development > ../logs/api-dev.log 2>&1 &
	@cd mantine.web && npm run local:development > ../logs/web-dev.log 2>&1 &
	@sleep 3
	@echo "   Development servers started"
	@echo ""
	@echo "✨ Development environment ready (Local → AWS Development)!"
	@echo ""
	@echo "  API:        http://localhost:3001 → AWS Development"
	@echo "  Web:        http://localhost:5173 → AWS Development"

cloud-staging:
	@echo "☁️  Starting staging environment (Local → AWS Staging)"
	@mkdir -p logs
	@echo "🚀 Starting development servers (AWS staging environment)..."
	@cd api.hypermedia && npm run local staging > ../logs/api-staging.log 2>&1 &
	@cd mantine.web && npm run local:staging > ../logs/web-staging.log 2>&1 &
	@sleep 3
	@echo "   Development servers started"
	@echo ""
	@echo "✨ Staging environment ready (Local → AWS Staging)!"
	@echo ""
	@echo "  API:        http://localhost:3001 → AWS Staging"
	@echo "  Web:        http://localhost:5173 → AWS Staging"

# Create logs directory if it doesn't exist
$(shell mkdir -p logs)