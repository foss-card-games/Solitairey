.PHONY: help build up down dev logs clean rebuild test traditional shell dev-shell start full

# Detect compose command (podman-compose or podman compose)
COMPOSE_BIN := $(shell command -v podman-compose 2>/dev/null)
ifndef COMPOSE_BIN
	COMPOSE_BIN := podman compose
endif
COMPOSE := $(COMPOSE_BIN) -f docker/docker-compose.yml

.DEFAULT_GOAL := help

help:
	@echo "Solitairey Build Commands"
	@echo "=========================="
	@echo ""
	@echo "Container (Podman/Docker compatible):"
	@echo "  make build      - Build production image"
	@echo "  make up         - Start production server (port 8663)"
	@echo "  make down       - Stop all services"
	@echo "  make dev        - Start development server (port 8000)"
	@echo "  make logs       - View production logs"
	@echo "  make clean      - Remove containers and volumes"
	@echo "  make rebuild    - Clean rebuild from scratch"
	@echo "  make test       - Run build test"
	@echo "  make shell      - Open shell in production container"
	@echo "  make dev-shell  - Open shell in development container"
	@echo ""
	@echo "Traditional:"
	@echo "  make traditional - Run rake build directly"

build:
	$(COMPOSE) build web

up:
	$(COMPOSE) up -d web
	@echo "Solitairey is running at http://localhost:8663"

down:
	$(COMPOSE) down

dev:
	$(COMPOSE) --profile dev up dev
	@echo "Development server at http://localhost:8000"

logs:
	$(COMPOSE) logs -f web

clean:
	$(COMPOSE) down -v
	podman system prune -f

rebuild: clean
	$(COMPOSE) build --no-cache web
	$(COMPOSE) up -d web

test:
	$(COMPOSE) --profile build run --rm builder

shell:
	$(COMPOSE) exec web sh

dev-shell:
	$(COMPOSE) --profile dev run --rm dev bash

start: build up

full: clean build test up

traditional:
	bash -ex bin/install-npm-deps.sh
	rake
