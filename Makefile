.DEFAULT_GOAL := help

COMPOSE := docker compose
MIN_DOCKER_MEMORY_BYTES := 4294967296

.PHONY: help setup run start stop restart logs logs-api status reset format lint test test-integration test-smoke typecheck audit docker-build check

help:
	@printf '%s\n' \
		'KitaMeraki backend local development' \
		'' \
		'  make setup     Check Docker, pull dependencies, and build the API image' \
		'  make run       Run the complete stack in the foreground' \
		'  make start     Run the complete stack in the background' \
		'  make stop      Stop the stack without deleting local data' \
		'  make restart   Restart the stack without deleting local data' \
		'  make logs      Follow logs from all services' \
		'  make logs-api  Follow logs from the API service' \
		'  make status    Show service status' \
		'  make reset     Stop the stack and delete local emulator data' \
		'  make check     Run the complete local quality gate' \
		'  make test-integration  Run tests against the Cosmos emulator' \
		'  make test-smoke        Start the stack and test the HTTP API'

setup:
	@command -v docker >/dev/null 2>&1 || { echo 'Docker is not installed.'; exit 1; }
	@$(COMPOSE) version >/dev/null 2>&1 || { echo 'Docker Compose is not available.'; exit 1; }
	@docker info >/dev/null 2>&1 || { echo 'Docker daemon is not running.'; exit 1; }
	@docker_memory_bytes=`docker info --format '{{.MemTotal}}'`; \
	if [ "$$docker_memory_bytes" -lt "$(MIN_DOCKER_MEMORY_BYTES)" ]; then \
		echo 'Docker needs at least 4 GiB of memory for Cosmos DB and the amd64 Azure Functions runtime.'; \
		echo 'Increase the Docker VM memory, then run make setup again.'; \
		exit 1; \
	fi
	$(COMPOSE) pull cosmos azurite
	$(COMPOSE) build api

run:
	$(COMPOSE) up --build

start:
	$(COMPOSE) up --build --detach

stop:
	$(COMPOSE) down --remove-orphans

restart:
	$(COMPOSE) down --remove-orphans
	$(COMPOSE) up --build --detach

logs:
	$(COMPOSE) logs --follow

logs-api:
	$(COMPOSE) logs --follow api

status:
	$(COMPOSE) ps

reset:
	@printf 'Delete all local Cosmos DB and Azurite data? [y/N] '; \
	read answer; \
	case "$$answer" in \
		y|Y) $(COMPOSE) down --volumes --remove-orphans ;; \
		*) echo 'Reset cancelled.' ;; \
	esac

check:
	npm run check
	npm run audit:production

format:
	npm run format

lint:
	npm run lint

test:
	npm test

test-integration:
	$(COMPOSE) up --detach cosmos
	npm run test:integration

test-smoke:
	$(COMPOSE) up --build --detach --wait
	npm run test:smoke

typecheck:
	npm run typecheck

audit:
	npm run audit:production

docker-build:
	$(COMPOSE) build api
