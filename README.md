# NestJS Boilerplate

> A production-ready NestJS 11 service template built on Fastify, MongoDB, Redis caching, rate
> limiting, structured logging (Seq), observability (Prometheus + Grafana), and Docker-first
> workflows.

## Feature Highlights

| Category                 | Features                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **HTTP**                 | Fastify adapter, Helmet security headers, global `ValidationPipe`, Swagger UI at `/docs`                      |
| **Data**                 | MongoDB via Mongoose, Redis cache (`cache-manager-redis-yet`), soft-delete plugin, pagination helper          |
| **Resilience**           | Rate limiting (`ThrottlerGuard`), idempotency interceptor, graceful shutdown hooks                            |
| **Observability**        | Seq structured logging, Prometheus metrics + Grafana dashboards, correlation ID per request                   |
| **Architecture**         | Zod-validated env config, event-driven (`@nestjs/event-emitter`), request context via CLS (AsyncLocalStorage) |
| **Developer Experience** | Database seeder CLI, Docker Compose stacks (dev/staging/prod/test), CI via GitHub Actions                     |

## Architecture Overview

### Bootstrap (`src/bootstrap.ts`)

Single-file bootstrap that creates a `NestFastifyApplication` and registers:

- Helmet (CSP disabled for APIs)
- `ValidationPipe` with whitelist + transform
- Swagger at `/docs` — title and description read from `APP_NAME` / `APP_DESCRIPTION` env vars
- `GlobalExceptionFilter` with `SeqLogger`
- `ConsoleSeqLogger` as the application logger
- `LoggingInterceptor` + `ResponseInterceptor` (both DI-resolved)
- Graceful shutdown hooks
- Listens on `PORT` from `ConfigService`

### App Module (`src/app.module.ts`)

- `ConfigModule` — global, validates `.env` with Zod schema (`src/shared/config/env.schema.ts`)
- `ContextModule` — global, provides `RequestContext` (CLS) + `CorrelationIdMiddleware`
- `EventEmitterModule` — in-process event bus
- `MongooseModule` — connects via `MONGODB_URI`
- `CacheModule` — Redis with `CACHE_TTL`, falls back to in-memory
- `ThrottlerModule` — rate limiting via `THROTTLE_TTL` / `THROTTLE_LIMIT`
- `LoggerModule` — Seq structured logging (`src/integrations/logger/`)
- `MonitoringModule` — Prometheus metrics interceptor (`src/integrations/monitoring/`)
- Domain modules: `AuthModule`, `HealthModule`

### Shared (`src/shared/`)

Core infrastructure — no third-party service coupling.

| Directory       | Purpose                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| `config/`       | Zod env schema, `EnvConfig` type, `ConfigModule` setup                     |
| `context/`      | `ContextModule`, `CorrelationIdMiddleware`, `RequestContext` service (CLS) |
| `database/`     | Mongoose soft-delete plugin (`deletedAt`, `softDelete()`, `restore()`)     |
| `filters/`      | `GlobalExceptionFilter` with `ApiErrorCode` mapping                        |
| `health/`       | `HealthModule`, liveness + readiness controller, Redis health indicator    |
| `http/`         | `ApiSuccessResponse`, `ApiErrorResponse`, idempotency utilities            |
| `interceptors/` | Response envelope, idempotency interceptors                                |
| `pagination/`   | `PaginationQueryDto`, `paginate()` helper, `PaginatedResponse<T>` type     |

### Integrations (`src/integrations/`)

Third-party service wrappers — each folder is independently replaceable.

| Directory    | Purpose                                             |
| ------------ | --------------------------------------------------- |
| `logger/`    | `LoggerModule` (Seq), `LoggingInterceptor`          |
| `mail/`      | `MailModule`, `MailService` (Resend)                |
| `monitoring/`| `MonitoringModule` (Prometheus), `MetricsInterceptor` |

### Domain Modules (`src/modules/`)

- **Auth** — Email/password authentication with OTP verification for login and registration,
  JWT-based session, forgot password + reset password flow, and protected profile endpoint.
  - `guards/` — `AuthGuard`
  - `decorators/` — `@Public()`, `@Roles()`
  - `otp/` — `OtpCodeService`, `OtpCodeRepository`, `OtpCodeCacheRepository`, schema
- **Customer** — Customer persistence + Redis-backed read-through caching by `id` and `email`.

## Repository Layout

```
├── docker/
│   ├── compose.{base,dev,staging,prod,test}.yml
│   ├── env/                       # .env.dev, .env.example, .env.test, .env.prod, .env.staging
│   ├── images/api/                # Dockerfile.{dev,prod,staging,test}
│   ├── grafana/provisioning/      # dashboards + datasources
│   └── prometheus/                # prometheus.yml
├── src/
│   ├── main.ts                    # entry point
│   ├── bootstrap.ts               # app bootstrap
│   ├── app.module.ts              # root module
│   ├── cli/
│   │   └── seed.ts                # database seeder CLI
│   ├── integrations/              # third-party service wrappers
│   │   ├── logger/                # Seq — LoggerModule + LoggingInterceptor
│   │   ├── mail/                  # Resend — MailModule + MailService
│   │   └── monitoring/            # Prometheus — MonitoringModule + MetricsInterceptor
│   ├── shared/                    # core infrastructure (no external service coupling)
│   │   ├── config/                # Zod env validation + EnvConfig type
│   │   ├── context/               # CLS + correlation ID middleware
│   │   ├── database/              # soft-delete plugin
│   │   ├── filters/               # global exception filter
│   │   ├── health/                # health + readiness controller
│   │   ├── http/                  # response types, request helpers
│   │   ├── interceptors/          # response envelope, idempotency
│   │   └── pagination/            # pagination DTO + helper
│   └── modules/
│       ├── auth/
│       │   ├── decorators/        # @Public(), @Roles()
│       │   ├── dto/               # request DTOs
│       │   ├── guards/            # AuthGuard
│       │   └── otp/               # OTP service, repositories, schema
│       └── customer/              # customer service, repository, cache repository
├── test/
│   ├── auth.e2e-spec.ts
│   └── utils/                     # test assertion helpers
├── Makefile
└── .github/workflows/
```

## Auth API Overview

All responses are wrapped by the global response interceptor.

| Endpoint                                | Method | Description                                                  |
| --------------------------------------- | ------ | ------------------------------------------------------------ |
| `/auth/register`                        | POST   | Create account and send OTP to email                         |
| `/auth/register-verify-otp-code`        | POST   | Verify registration OTP and return JWT                       |
| `/auth/login`                           | POST   | Validate credentials and send OTP                            |
| `/auth/login-verify-otp-code`           | POST   | Verify login OTP and return JWT                              |
| `/auth/forgot-password`                 | POST   | Send reset OTP to email                                      |
| `/auth/forgot-password-verify-otp-code` | POST   | Verify reset OTP before changing password                    |
| `/auth/reset-password`                  | POST   | Set new password with verified OTP                           |
| `/auth/profile`                         | GET    | Protected profile endpoint (`Authorization: Bearer <token>`) |

## Test Coverage

- Unit tests — `src/modules/auth/__tests__/auth.service.spec.ts`
- Unit tests — `src/modules/customer/__tests__/customer.service.spec.ts`
- E2E tests — `test/auth.e2e-spec.ts`
- Compose-based integration run: `make test` (MongoDB + Redis + API + tests container)

## Getting Started

### Prerequisites

- **Node.js** ≥ 20 (Docker images use Node 22-slim)
- **npm** 10+
- **Docker Desktop** (or compatible engine) for compose stacks

### Install & Run

```bash
# install
npm install

# development (watch mode)
npm run start:dev

# production
npm run build && npm run start:prod

# seed database
npm run seed
```

### Environment Configuration

Copy `docker/env/.env.example` to `.env` at the repository root. All variables are validated at
startup via Zod — the app will fail fast with clear error messages if required values are missing or
malformed.

## npm Scripts

| Script               | Description                        |
| -------------------- | ---------------------------------- |
| `npm run start:dev`  | Start in watch mode                |
| `npm run build`      | Compile TypeScript                 |
| `npm run start:prod` | Run compiled output                |
| `npm run seed`       | Seed the database with sample data |
| `npm run lint`       | ESLint with auto-fix               |
| `npm run format`     | Prettier format                    |
| `npm run test`       | Run unit tests                     |
| `npm run test:e2e`   | Run e2e tests                      |
| `npm run test:cov`   | Coverage report                    |

## Make Targets

| Target                               | Description                                                    |
| ------------------------------------ | -------------------------------------------------------------- |
| `make test`                          | Dockerized unit + e2e tests with real MongoDB/Redis            |
| `make dev`                           | Dev stack (API + MongoDB + Redis + Seq + Prometheus + Grafana) |
| `make staging` / `make staging-down` | Staging stack (detached)                                       |
| `make prod` / `make prod-down`       | Production stack (detached)                                    |

## Docker & Observability Stack

`docker/compose.base.yml` defines shared services:

- **MongoDB 7** — persistent `mongo-data` volume
- **Redis 7** — plus exporter for Prometheus
- **Seq** — structured log ingestion (HTTP `8081`, ingestion `5341`)
- **Prometheus + Grafana** — pre-provisioned dashboards and datasources

Environment-specific compose files (`dev`, `staging`, `prod`, `test`) extend the base with the
appropriate Dockerfile and runtime flags.

## Environment Variables

| Variable                   | Default                             | Purpose                                   |
| -------------------------- | ----------------------------------- | ----------------------------------------- |
| `NODE_ENV`                 | `development`                       | Runtime environment                       |
| `PORT`                     | `3000`                              | Fastify listen port                       |
| `APP_NAME`                 | `NestJS Boilerplate`                | Swagger UI title                          |
| `APP_DESCRIPTION`          | `NestJS Boilerplate backend API`    | Swagger UI description                    |
| `MONGODB_URI`              | `mongodb://127.0.0.1:27017/turtles` | MongoDB connection string                 |
| `REDIS_URL`                | `redis://127.0.0.1:6379`            | Redis connection string                   |
| `CACHE_TTL`                | `5`                                 | Cache TTL in seconds                      |
| `THROTTLE_TTL`             | `60`                                | Rate-limit window (seconds)               |
| `THROTTLE_LIMIT`           | `100`                               | Requests per IP per window                |
| `HEALTH_HEAP_THRESHOLD_MB` | `150`                               | Max heap before health check fails        |
| `HEALTH_RSS_THRESHOLD_MB`  | `300`                               | Max RSS before health check fails         |
| `RESEND_API_KEY`           | —                                   | Resend API key for transactional email    |
| `RESEND_FROM`              | `noreply@example.com`               | Sender address for OTP mails              |
| `SEQ_SERVER_URL`           | —                                   | Seq ingestion endpoint (optional)         |
| `SEQ_API_KEY`              | —                                   | Seq API key (optional)                    |
| `SEQ_SERVICE_NAME`         | `nestjs-boilerplate`                | Service name sent to Seq                  |
| `PROMETHEUS_METRICS_PATH`  | `metrics`                           | Prometheus scrape path                    |
| `AUTH_JWT_SECRET`          | `your_jwt_secret_key`               | JWT signing secret — change in production |

## Continuous Integration

`.github/workflows/tests.yml` runs on every push/PR to `main`:

1. Checkout → Docker Buildx setup → `make test`
2. Tests run against real MongoDB/Redis containers, matching production parity.

## License

MIT — see [LICENSE](LICENSE) for details.
