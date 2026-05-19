COMPOSE ?= docker compose

.PHONY: dev dev-down prod prod-down

dev:
	$(COMPOSE) up --build

prod:
	docker build --target runner -t nestjs-boilerplate:prod . && docker run -p 3000:3000 --env-file .env nestjs-boilerplate:prod

prod-down:
	docker stop $$(docker ps -q --filter ancestor=nestjs-boilerplate:prod) 2>/dev/null || true
