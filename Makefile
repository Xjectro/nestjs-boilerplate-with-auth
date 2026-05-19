COMPOSE ?= docker compose

.PHONY: dev down

start:
	$(COMPOSE) up --build
