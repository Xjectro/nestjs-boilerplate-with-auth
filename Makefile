COMPOSE ?= docker compose
COMPOSE_BASE := docker/compose.base.yml
COMPOSE_DEV := docker/compose.dev.yml
COMPOSE_STAGING := docker/compose.staging.yml
COMPOSE_PROD := docker/compose.prod.yml
COMPOSE_TEST := docker/compose.test.yml

ENV_DIR := docker/env

COMPOSE_TEST_CMD := $(COMPOSE) --env-file $(ENV_DIR)/.env.test -f $(COMPOSE_BASE) -f $(COMPOSE_TEST)
COMPOSE_DEV_CMD := $(COMPOSE) --env-file $(ENV_DIR)/.env.dev -f $(COMPOSE_BASE) -f $(COMPOSE_DEV)
COMPOSE_STAGING_CMD := $(COMPOSE) --env-file $(ENV_DIR)/.env.staging -f $(COMPOSE_BASE) -f $(COMPOSE_STAGING)
COMPOSE_PROD_CMD := $(COMPOSE) --env-file $(ENV_DIR)/.env.prod -f $(COMPOSE_BASE) -f $(COMPOSE_PROD)

.PHONY: test dev staging staging-down prod prod-down

test: 
	$(COMPOSE_TEST_CMD) up --build --abort-on-container-exit --exit-code-from tests

dev: 
	$(COMPOSE_DEV_CMD) up --build

staging: 
	$(COMPOSE_STAGING_CMD) up --build -d

staging-down: 
	$(COMPOSE_STAGING_CMD) down -v --remove-orphans

prod: 
	$(COMPOSE_PROD_CMD) up --build -d

prod-down: 
	$(COMPOSE_PROD_CMD) down -v --remove-orphans
