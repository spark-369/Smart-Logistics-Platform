# Smart Logistics Platform (SLP)

A production-oriented, full-stack logistics management system for booking shipments, dispatching
drivers and vehicles, recording journey events, and publishing public parcel tracking.

The platform is built as two independently deployable applications:

| Layer | Technology | Location |
|-------|-----------|----------|
| **Backend** | Java 17 · Spring Boot 4.1.0 · Spring Security · Spring Data JPA · PostgreSQL | [`backend/`](./backend) |
| **Frontend** | React 19 · Vite 8 · Material UI 7 · React Router 7 · Axios | [`frontend/`](./frontend) |

Authentication is **stateless JWT** carried in an `Authorization: Bearer <token>` header, with
**role-based access control (RBAC)** enforced on both the server (authoritative) and the client
(navigation and UX only).

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Run with Docker Compose](#run-with-docker-compose)
  - [Run Locally](#run-locally)
- [Backend Documentation](#backend-documentation)
  - [Overview](#backend-overview)
  - [Layered Architecture](#layered-architecture)
  - [Package Layout](#package-layout)
  - [Domain Model](#domain-model)
  - [Security Model](#security-model)
  - [Error Handling Contract](#error-handling-contract)
  - [Configuration Reference](#configuration-reference)
  - [Logging](#logging)
  - [Testing](#testing)
- [API Reference](#api-reference)
- [Frontend Documentation](#frontend-documentation)
  - [Overview](#frontend-overview)
  - [Source Layout](#source-layout)
  - [Routing & Access Control](#routing--access-control)
  - [Session & Authentication](#session--authentication)
  - [HTTP Layer](#http-layer)
  - [Design System & Theming](#design-system--theming)
  - [Shared Components](#shared-components)
  - [Pages](#pages)
  - [Utilities & Constants](#utilities--constants)
- [Environment Variables](#environment-variables)
- [Docker & Deployment](#docker--deployment)
- [Development Conventions](#development-conventions)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────────┐
│        Browser (SPA)        │         │        Spring Boot API           │
│  React 19 + MUI 7 + Vite    │  HTTPS  │  Controllers → Services → JPA    │
│                             │ ──────► │                                  │
│  • AuthContext (JWT in      │  JSON   │  • JwtAuthFilter (stateless)     │
│    localStorage)            │ Bearer  │  • @PreAuthorize (RBAC)          │
│  • Axios instance +         │         │  • GlobalExceptionHandler        │
│    interceptors             │         │  • Swagger / OpenAPI 3           │
└─────────────────────────────┘         └───────────────┬──────────────────┘
                                                        │ JDBC / HikariCP
                                                        ▼
                                            ┌────────────────────────┐
                                            │  PostgreSQL 15         │
                                            │  (H2 in tests)         │
                                            └────────────────────────┘
```

**Request lifecycle (authenticated call):**

1. The browser sends `Authorization: Bearer <jwt>` (injected by the Axios request interceptor).
2. `JwtAuthFilter` parses the token, loads the principal from the database, and populates the
   `SecurityContext`. Invalid tokens are *ignored* (the request continues anonymously) rather than
   failing with a `500`.
3. Spring Security URL rules in `SecurityConfig` perform coarse-grained authorization.
4. `@PreAuthorize` on the controller method performs fine-grained authorization.
5. The service layer re-validates **ownership** rules (e.g. a customer may only read their own
   shipments), because role checks alone are insufficient for row-level security.
6. `GlobalExceptionHandler` converts any exception into the uniform response envelope.

**In development**, the Vite dev server proxies `/api` to the backend so the browser only ever talks
to a single origin. **In production**, Nginx serves the built SPA and reverse-proxies `/api` to the
backend container — the same single-origin behaviour, so CORS never enters the picture in either
mode.


---

## Tech Stack

### Backend

| Component | Version | Purpose |
|-----------|---------|---------|
| Java | 17 | Language / runtime |
| Spring Boot | 4.1.0 | Application framework |
| Spring Web (MVC) | managed | REST controllers |
| Spring Security | managed | Authentication & authorization |
| Spring Data JPA / Hibernate | managed | Persistence |
| Bean Validation (Jakarta) | managed | Request DTO validation |
| PostgreSQL JDBC Driver | managed | Database driver |
| HikariCP | managed | Connection pool |
| jjwt (`jjwt-api` / `-impl` / `-jackson`) | 0.12.6 | JWT creation & verification |
| springdoc-openapi (`webmvc-ui`) | 2.7.0 | OpenAPI 3 + Swagger UI |
| Lombok | managed | Boilerplate reduction |
| JSpecify | 1.0.0 | Nullability annotations (`provided`) |
| Spring Boot Actuator | managed | Health / info endpoints (opt-in) |
| Maven Wrapper | 3.3.4 | Reproducible builds (`./mvnw`) |

**Test-only dependencies:** JUnit 5, AssertJ, Mockito, `spring-boot-starter-test`,
`spring-boot-resttestclient`, `spring-boot-restclient`, `spring-security-test`, and H2 (in-memory).

### Frontend

| Component | Version | Purpose |
|-----------|---------|---------|
| React / React DOM | ^19.2.7 | UI runtime |
| Vite | ^8.1.1 | Dev server & bundler |
| `@vitejs/plugin-react` | ^6.0.3 | React fast refresh / JSX transform |
| Material UI (`@mui/material`, `@mui/icons-material`) | ^7.0.2 | Component library |
| Emotion (`@emotion/react`, `@emotion/styled`) | ^11.14.0 | MUI styling engine |
| React Router DOM | ^7.5.3 | Client-side routing |
| Axios | ^1.8.4 | HTTP client |
| Recharts | ^2.15.3 | Dashboard charts |
| ESLint (+ react-hooks, react-refresh) | ^10.6.0 | Linting |

---

## Repository Structure

```
v1/
├── backend/
│   ├── .mvn/wrapper/                 # Maven Wrapper configuration
│   ├── mvnw, mvnw.cmd                # Wrapper scripts
│   ├── pom.xml                       # Dependencies & build
│   ├── Dockerfile                    # Multi-stage, layered-jar, non-root
│   └── src/
│       ├── main/
│       │   ├── java/com/slp/backend/
│       │   │   ├── BackendApplication.java
│       │   │   ├── config/           # Security, JWT filter, Swagger, admin bootstrap
│       │   │   ├── controller/       # REST controllers (8)
│       │   │   ├── dto/request/      # Inbound payloads (8)
│       │   │   ├── dto/response/     # Outbound projections (10)
│       │   │   ├── entity/           # JPA entities + enums
│       │   │   ├── exception/        # Custom exceptions + global handler
│       │   │   ├── repository/       # Spring Data repositories (6)
│       │   │   ├── service/          # Service interfaces
│       │   │   │   └── impl/         # Service implementations (8)
│       │   │   └── util/             # JwtUtil, CurrentUserUtil, AppConstants
│       │   └── resources/
│       │       ├── application.properties
│       │       └── logback-spring.xml
│       └── test/
│           ├── java/com/slp/backend/
│           │   ├── config/           # AdminBootstrapTest
│           │   ├── controller/       # *IT end-to-end HTTP suites
│           │   ├── security/         # AuthorizationIT (RBAC regression suite)
│           │   ├── service/          # Unit tests
│           │   ├── support/          # AbstractIntegrationTest, TestDataFactory
│           │   └── util/             # JwtUtilTest
│           └── resources/application-test.properties
├── frontend/
│   ├── index.html                    # Shell with inline first-paint splash
│   ├── nginx.conf                    # SPA fallback + /api reverse proxy
│   ├── vite.config.js                # Dev proxy, manual vendor chunks
│   ├── eslint.config.js              # Flat ESLint config
│   ├── package.json
│   ├── Dockerfile                    # Node build → Nginx runtime
│   └── src/
│       ├── main.jsx                  # React root
│       ├── App.jsx                   # Providers + route table
│       ├── index.css                 # Global, print & a11y styles
│       ├── components/               # Shared UI components (15)
│       ├── constants/index.js        # Enums, colours, pagination defaults
│       ├── context/AuthContext.jsx   # Session state & role helpers
│       ├── pages/                    # Route-level pages (15)
│       ├── services/                 # api.js + 8 domain API modules
│       ├── theme/                    # tokens.js, index.js, ColorModeContext.jsx
│       └── utils/format.js           # Formatting & error-message helpers
├── docker-compose.yml                # postgres + backend + frontend
└── README.md
```

> **Schema management:** the project ships **no** migration tool (no Flyway / Liquibase) and no
> `schema.sql`. Schema creation is delegated to Hibernate `ddl-auto` — see
> [Configuration Reference](#configuration-reference).

---

## Getting Started

### Prerequisites

| Tool | Version | Needed for |
|------|---------|-----------|
| JDK | 17+ | Running / building the backend |
| Node.js | 20+ (18 minimum) | Running / building the frontend |
| PostgreSQL | 15 | Local (non-Docker) backend runs |
| Docker + Compose | recent | The all-in-one Docker workflow |
| Maven | *not required* | Use the bundled `./mvnw` wrapper |

### Run with Docker Compose

The fastest path — brings up PostgreSQL, the API, and the Nginx-served SPA:

```bash
# JWT_SECRET is required by the compose file; generate a strong one first.
export JWT_SECRET="$(openssl rand -hex 32)"

docker compose up --build
```

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost | Nginx, port 80 |
| Backend API | http://localhost:8080 | Spring profile `prod` |
| Swagger UI | http://localhost:8080/swagger-ui.html | Interactive API docs |
| PostgreSQL | localhost:5432 | Volume `postgres_data` persists data |

The backend waits for PostgreSQL's health check before starting
(`depends_on: condition: service_healthy`).

### Run Locally

**1. Database**

```bash
createdb slp_db
# or: psql -c "CREATE DATABASE slp_db;"
```

> **Important:** `spring.jpa.hibernate.ddl-auto` defaults to `validate`, which means Hibernate
> **will not create tables** — it only verifies that the existing schema matches the entities. On a
> brand-new database, either apply your own DDL, or run the first boot with schema generation
> enabled:
>
> ```bash
> JPA_DDL_AUTO=update ./mvnw spring-boot:run
> ```
>
> After the schema exists, revert to the default `validate` so drift is caught early.

**2. Backend**

```bash
cd backend
./mvnw spring-boot:run
```

Runs on `http://localhost:8080` with the `dev` profile. On first boot with an empty `users` table,
`AdminBootstrap` creates a default administrator (see [Security Model](#security-model)).

**3. Frontend**

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` and proxies `/api` and `/api-docs` to `http://localhost:8080`
(override with `VITE_PROXY_TARGET`).

**4. Sign in**

Use the bootstrapped administrator credentials, then change the password immediately:

| Email | Password |
|-------|----------|
| `admin@slp.com` | `admin123` |

---

## Backend Documentation

### Backend Overview

The backend is a Spring Boot 4 application exposing a REST API under `/api/**`. It is organised as a
classic layered architecture with a strict separation between API contracts (`dto`), domain state
(`entity`), and business rules (`service`).

Key characteristics:

- **Stateless** — no HTTP session; every request is authenticated independently from its JWT.
- **Method-level RBAC** — every controller method declares its own `@PreAuthorize` expression.
- **Row-level ownership** — services additionally verify that the caller owns/participates in the
  resource, not merely that they hold the right role.
- **Uniform error envelope** — all errors are serialised as `{ success, message, data }`.
- **Open-in-view disabled** — `spring.jpa.open-in-view=false`, so all data needed for a response is
  fetched inside the service transaction and mapped to DTOs before returning.

### Layered Architecture

| Layer | Package | Responsibility |
|-------|---------|----------------|
| **API / Controller** | `controller` | HTTP binding, status codes, `@PreAuthorize`, OpenAPI annotations |
| **Contract** | `dto.request`, `dto.response` | Validated inbound payloads; safe outbound projections |
| **Business logic** | `service`, `service.impl` | Transactions, invariants, ownership checks, entity→DTO mapping |
| **Persistence** | `repository` | Spring Data JPA interfaces with derived query methods |
| **Domain** | `entity` | JPA entities and enums |
| **Cross-cutting** | `config`, `exception`, `util` | Security, JWT, Swagger, error handling, current-user resolution |

**Dependency direction:** `controller → service → repository → entity`. Controllers never touch
repositories, and entities are never returned directly from an endpoint — a DTO is always used so
lazy associations are not serialised and sensitive fields (notably `password`) can never leak.

### Package Layout

**`config`**

| Class | Purpose |
|-------|---------|
| `SecurityConfig` | `SecurityFilterChain`, URL authorization rules, CORS, BCrypt encoder, 401/403 entry points. Carries `@EnableWebSecurity` **and `@EnableMethodSecurity`** — without the latter every `@PreAuthorize` is silently ignored. |
| `JwtAuthFilter` | `OncePerRequestFilter` that resolves `Authorization: Bearer <jwt>` into a Spring Security authentication. Never fails a request itself; a bad token simply leaves the context anonymous so downstream rules answer 401. |
| `SwaggerConfig` | `OpenAPI` metadata (bearer auth scheme) plus two `GroupedOpenApi` groups: `public` (`/api/auth/**`) and `authenticated` (`/api/**`). |
| `AdminBootstrap` | `ApplicationRunner` that seeds the first ADMIN account on an empty database. |

**`controller`** — `AuthController`, `ShipmentController`, `DriverController`, `VehicleController`,
`UserController`, `TrackingController`, `DashboardController`, `NotificationController`.

**`exception`** — `BadRequestException` (400), `ResourceNotFoundException` (404),
`UnauthorizedException` (403), and `GlobalExceptionHandler` (`@RestControllerAdvice`).

**`util`**

| Class | Purpose |
|-------|---------|
| `JwtUtil` | Token generation/validation using the jjwt 0.12 API (`Jwts.parser().verifyWith(...)`). |
| `CurrentUserUtil` | Resolves the authenticated `User` entity from the `SecurityContext`, plus a `hasRole(Role...)` helper. |
| `AppConstants` | Default admin email / password / name constants. |

### Domain Model

**Entities**

| Entity | Table | Key fields |
|--------|-------|-----------|
| `User` | `users` | `id`, `email` (unique), `password` (BCrypt hash), `firstName`, `lastName`, `phoneNumber`, `role`, `enabled`, `createdAt`, `updatedAt` |
| `Driver` | `drivers` | `id`, `licenseNumber` (unique), `status`, `user` (1:1, unique FK), `vehicle` (1:1, mapped by `Vehicle.driver`) |
| `Vehicle` | `vehicles` | `id`, `plateNumber` (unique), `model`, `vehicleType`, `capacity`, `status`, `driver` (1:1, unique FK) |
| `Shipment` | `shipments` | `id`, `trackingNumber` (unique), `sender`/`receiver` (M:1 → `users`), `driver`/`vehicle` (M:1, nullable), `status`, origin/destination address blocks, `weight`, `description`, `estimatedDelivery`, `actualDelivery` |
| `TrackingEvent` | `tracking_events` | `id`, `shipment` (M:1), `status`, `location`, `description`, `timestamp` |
| `Notification` | `notifications` | `id`, `user` (M:1), `title`, `message`, `read`, `createdAt` |

**Relationships**

```
User 1 ──── 1 Driver 1 ──── 1 Vehicle
  │                              │
  │ sender / receiver            │ vehicle (nullable)
  ▼                              ▼
Shipment ──── M:1 Driver    Shipment ──── M:1 Vehicle
  │
  └── 1:N TrackingEvent

User 1 ──── N Notification
```

**Enums**

| Enum | Values | Notes |
|------|--------|-------|
| `Role` | `ADMIN`, `CUSTOMER`, `DRIVER`, `DISPATCHER` | Persisted as `STRING`; granted as `ROLE_<name>` authorities |
| `ShipmentStatus` | `PENDING`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED` | |
| `DriverStatus` | `AVAILABLE`, `ON_TRIP`, `INACTIVE` | An enum so invalid values are rejected at the API boundary |
| `VehicleStatus` | `AVAILABLE`, `IN_USE`, `MAINTENANCE` | |

**Referential integrity notes**

- Deleting a `Shipment` cascades to its `TrackingEvent` rows (`cascade = ALL`, `orphanRemoval`).
- Deleting a `User` cascades to their `Notification` rows.
- `Driver.user_id` and `Vehicle.driver_id` are both `unique`, enforcing a strict 1:1 pairing.

**Domain invariants enforced in the service layer**

| Rule | Where |
|------|-------|
| Sender and receiver must be different users | `ShipmentServiceImpl.createShipment` |
| A CUSTOMER may only create a shipment where they are the sender | `ShipmentServiceImpl.createShipment` |
| `ASSIGNED` requires both a driver and a vehicle | `TrackingServiceImpl.applyStatusFromEvent` |
| A vehicle without a driver cannot be `IN_USE` | `VehicleServiceImpl.createVehicle` |
| A driver cannot be attached to two vehicles | `VehicleServiceImpl.createVehicle` / `assignDriver` |
| A driver attached to a vehicle cannot be set `INACTIVE` | `DriverServiceImpl.updateDriverStatus` |
| A DRIVER may only append tracking events to their own shipment | `TrackingServiceImpl.addTrackingEvent` |
| An admin cannot delete their own account | `UserController.deleteUser` |
| A `DELIVERED` event stamps `actualDelivery` and syncs the shipment status | `TrackingServiceImpl.addTrackingEvent` |

**Tracking number generation:** `SLP-` + the first 8 characters of a random UUID, upper-cased
(e.g. `SLP-4F2A91C3`). Driver licence numbers are generated as `DL-<epoch millis>`.


### Security Model

**Authentication flow**

1. `POST /api/auth/login` → `AuthServiceImpl` delegates to `AuthenticationManager` →
   `DaoAuthenticationProvider` → `CustomUserDetailsService.loadUserByUsername(email)`.
2. `CustomUserDetailsService` loads the `User` and returns a Spring `UserDetails` whose authorities
   are `ROLE_<ROLE>` and whose `disabled` flag mirrors `User.enabled`.
3. On success, `JwtUtil.generateToken(email)` signs an HS256 token with `app.jwt.secret`, subject =
   email, expiry = `app.jwt.expiration` ms.
4. The token plus user identity are returned in `AuthResponse`; the SPA stores both in
   `localStorage`.
5. On each subsequent request, `JwtAuthFilter` verifies the signature/expiry and re-loads the
   principal from the database — so a deleted user or a disabled account is rejected even while
   their token is still cryptographically valid.

**Failure semantics (deliberate and client-visible)**

| Situation | Status | Reason |
|-----------|--------|--------|
| Missing / malformed / expired / forged token | **401** | `authenticationEntryPoint` — the SPA clears the session and returns to `/login` |
| Valid token, insufficient role | **403** | `accessDeniedHandler` — the SPA routes to `/unauthorized` |
| Wrong password or unknown email | **401** | `BadCredentialsException` — deliberately generic so email existence is never disclosed |
| Disabled account | **401** | `DisabledException` ("Account is disabled") |
| Authenticated but violates an ownership rule | **403** | `UnauthorizedException` — the session is *not* invalid, so 403 keeps the user signed in |

> Spring Security defaults to 403 for unauthenticated requests; the explicit
> `AuthenticationEntryPoint` overrides that to 401, because the SPA must distinguish "session
> expired" from "not permitted".

**URL-level rules** (`SecurityConfig`, evaluated in order)

| Matcher | Rule |
|---------|------|
| `OPTIONS /**` | permit all (CORS pre-flight) |
| `/api/auth/**` | permit all |
| `GET /api/shipments/public/**` | permit all (redacted public tracking) |
| `/swagger-ui/**`, `/swagger-ui.html`, `/v3/api-docs/**`, `/api-docs/**` | permit all |
| `/error` | permit all |
| `/actuator/health/**`, `/actuator/info` | permit all — **only when `app.actuator.enabled=true`** |
| `/actuator/**` | `hasRole('ADMIN')` — only when actuator is enabled |
| `/api/admin/**` | `hasRole('ADMIN')` |
| `/api/driver/**` | `hasAnyRole('DRIVER','ADMIN')` |
| `/api/dispatcher/**` | `hasAnyRole('DISPATCHER','ADMIN')` |
| `/api/**` | `authenticated()` |
| anything else | `denyAll()` |

**Other hardening**

| Control | Setting |
|---------|---------|
| Password hashing | `BCryptPasswordEncoder(12)` |
| CSRF | Disabled (stateless token API, no cookies) |
| Session | `SessionCreationPolicy.STATELESS` |
| Frame options | `sameOrigin` (permits the bundled Swagger UI) |
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'` |
| CORS | Allowed origin **patterns** from `app.cors.allowed-origins`; methods `GET, POST, PUT, PATCH, DELETE, OPTIONS`; credentials allowed; `maxAge` 3600s; registered for `/api/**` |
| Public tracking payload | Redacted — no names, phone numbers, street addresses, weight, or internal ids |
| Error responses | Internal exception messages are logged, never returned (`500` is generic) |

**First-run administrator bootstrap** (`AdminBootstrap`)

| Guard | Behaviour |
|-------|-----------|
| `app.bootstrap.admin.enabled=false` | Skipped entirely |
| An ADMIN already exists | Skipped (never overwrites an existing deployment) |
| `prod` profile **and** the default password | Refused, with a warning telling you to set `APP_BOOTSTRAP_ADMIN_PASSWORD` |
| Otherwise | Creates the admin and logs a warning to change the password |

> **Production checklist:** disable the bootstrap (`APP_BOOTSTRAP_ADMIN_ENABLED=false`) after the
> first successful boot, and replace `JWT_SECRET` with a strong random value.

### Error Handling Contract

`GlobalExceptionHandler` guarantees that **every** error response has this shape:

```json
{ "success": false, "message": "Human readable description", "data": null }
```

Validation failures put per-field messages into `data`:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": { "originCity": "Origin city is required", "weight": "Weight must be greater than 0" }
}
```

**Exception → status mapping**

| Exception | Status | Message source |
|-----------|--------|----------------|
| `ResourceNotFoundException` | 404 | Exception message |
| `BadRequestException` | 400 | Exception message |
| `UnauthorizedException` | 403 | Exception message |
| `AccessDeniedException` (Spring Security) | 403 | Fixed: "You do not have permission to perform this action" |
| `BadCredentialsException` | 401 | Fixed: "Invalid email or password" |
| `DisabledException` | 401 | Fixed: "Account is disabled" |
| `AuthenticationException` (other) | 401 | Generic |
| `MethodArgumentNotValidException` | 400 | Per-field map in `data` |
| `ConstraintViolationException` | 400 | Per-field map in `data` |
| `HttpMessageNotReadableException` | 400 | "Malformed request body or unsupported value" |
| `MethodArgumentTypeMismatchException` | 400 | "Invalid value for parameter '<name>'" |
| `MissingServletRequestParameterException` | 400 | "Missing required parameter '<name>'" |
| `HttpRequestMethodNotSupportedException` | 405 | Spring's message |
| `NoResourceFoundException` | 404 | "Resource not found" |
| `DataIntegrityViolationException` | 409 | "The operation conflicts with existing data…" (cause logged) |
| `Exception` (catch-all) | 500 | Generic; stack trace logged only |

### Configuration Reference

All configuration lives in `backend/src/main/resources/application.properties`. Every value is
environment-overridable using `${VAR:default}` syntax.

**Core**

| Property | Env var | Default | Description |
|----------|---------|---------|-------------|
| `spring.profiles.active` | `APP_PROFILE` | `dev` | Active Spring profile |
| `server.port` | `SERVER_PORT` | `8080` | HTTP port |
| `server.compression.enabled` | — | `true` | Gzip responses |
| `server.http2.enabled` | — | `true` | HTTP/2 support |
| `server.error.include-message` | `ERROR_INCLUDE_MESSAGE` | `always` | Include `message` in Spring's error payload |
| `server.error.include-binding-errors` | `ERROR_INCLUDE_BINDING_ERRORS` | `always` | Include binding errors |
| `server.error.include-exception` | — | `true` | Include exception class |

**Database**

| Property | Env var | Default |
|----------|---------|---------|
| `spring.datasource.url` | `DB_HOST`, `DB_PORT`, `DB_NAME` | `jdbc:postgresql://localhost:5432/slp_db` |
| `spring.datasource.username` | `DB_USERNAME` | `postgres` |
| `spring.datasource.password` | `DB_PASSWORD` | `mysecretpassword` |
| `spring.datasource.hikari.maximum-pool-size` | `DB_POOL_MAX_SIZE` | `10` |
| `spring.datasource.hikari.minimum-idle` | `DB_POOL_MIN_IDLE` | `5` |
| `spring.datasource.hikari.connection-timeout` | — | `30000` ms |
| `spring.datasource.hikari.idle-timeout` | — | `600000` ms |
| `spring.datasource.hikari.max-lifetime` | — | `1800000` ms |
| `spring.datasource.hikari.pool-name` | — | `slp-hikari-pool` |

**JPA / Hibernate**

| Property | Env var | Default | Description |
|----------|---------|---------|-------------|
| `spring.jpa.hibernate.ddl-auto` | `JPA_DDL_AUTO` | `validate` | `validate` verifies the schema; **it does not create tables** |
| `spring.jpa.properties.hibernate.dialect` | — | `PostgreSQLDialect` | |
| `spring.jpa.show-sql` | `JPA_SHOW_SQL` | `true` | Log SQL (set `false` in production) |
| `spring.jpa.properties.hibernate.format_sql` | `JPA_FORMAT_SQL` | `true` | Pretty-print SQL |
| `spring.jpa.open-in-view` | — | `false` | Disabled to force explicit fetching in services |

**JWT, CORS & Actuator**

| Property | Env var | Default |
|----------|---------|---------|
| `app.jwt.secret` | `JWT_SECRET` | `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970` (dev only) |
| `app.jwt.expiration` | `JWT_EXPIRATION` | `86400000` (24 h, in ms) |
| `app.cors.allowed-origins` | `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` |
| `app.actuator.enabled` | `ACTUATOR_ENABLED` | `false` |

**Admin bootstrap**

| Property | Env var | Default |
|----------|---------|---------|
| `app.bootstrap.admin.enabled` | `APP_BOOTSTRAP_ADMIN_ENABLED` | `true` |
| `app.bootstrap.admin.email` | `APP_BOOTSTRAP_ADMIN_EMAIL` | `admin@slp.com` |
| `app.bootstrap.admin.password` | `APP_BOOTSTRAP_ADMIN_PASSWORD` | `admin123` |

**Swagger / OpenAPI**

| Property | Value |
|----------|-------|
| `springdoc.api-docs.path` | `/api-docs` |
| `springdoc.swagger-ui.path` | `/swagger-ui.html` |
| `springdoc.swagger-ui.operationsSorter` | `method` |
| `springdoc.swagger-ui.try-it-out-enabled` | `true` |

> **`JWT_SECRET` must be at least 32 bytes** for HS256 (`Keys.hmacShaKeyFor`). The shipped dev
> default is a 64-hex-character value; always override it in production.

### Logging

Configured in `backend/src/main/resources/logback-spring.xml` (`logging.config` points at it).

**Appenders**

| Appender | Target | Pattern / policy |
|----------|--------|------------------|
| `CONSOLE` | stdout | `%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n` |
| `FILE` | `logs/slp-backend.log` | Time + size based rollover, 50 MB per file, 30 days history, 5 GB cap, gzipped |
| `ERROR_FILE` | `logs/slp-backend-error.log` | `LevelFilter` accepting only `ERROR`, 25 MB per file, 30 days, 2 GB cap |

The log path and application name resolve from `logging.file.path` and `spring.application.name`
(both defaulted: `logs`, `slp-backend`). The configuration reloads every 30 seconds (`scan="true"`).

**Levels**

| Logger | `dev` (default) | `prod` profile |
|--------|-----------------|----------------|
| root | `INFO` | `WARN` |
| `com.slp.backend` | `DEBUG` | `INFO` |
| `org.springframework.web` | `INFO` | `WARN` |
| `org.springframework.security` | `INFO` | `WARN` |
| `org.hibernate.SQL` | `DEBUG` | `WARN` |
| `org.hibernate.type.descriptor.sql.BasicBinder` | `TRACE` | `OFF` |
| `org.springframework.data.jpa` | `INFO` | `WARN` |

The `test` profile (`application-test.properties`) overrides everything to `WARN` except
`com.slp.backend` (`INFO`) to keep CI output readable.

### Testing

**Commands**

```bash
cd backend
./mvnw test                     # full unit + integration suite
./mvnw test -Dtest=JwtUtilTest  # a single class
./mvnw verify                   # package + tests
```

**How the suite is wired**

- Surefire explicitly includes `**/*Test.java`, `**/*Tests.java` **and** `**/*IT.java` —
  integration suites named `*IT` would otherwise be silently skipped.
- `forkCount=1` with `reuseForks=true` keeps H2 state predictable; `-Xshare:off` suppresses the CDS
  self-attach warning.
- `AbstractIntegrationTest` boots the **full application on a random port**
  (`@SpringBootTest(webEnvironment = RANDOM_PORT)` + `@AutoConfigureTestRestTemplate`) with the
  `test` profile, so the real security filter chain, JWT filter, controllers, services,
  repositories, and exception handling are all exercised. Only the database is swapped for
  in-memory H2 in PostgreSQL compatibility mode.
- `TestDataFactory` seeds valid persisted domain graphs directly through repositories (fast), while
  authentication always goes through the real `POST /api/auth/login` endpoint so token generation
  uses production code.
- The test profile sets `ddl-auto=create-drop`, `server.port=0`, and
  `app.bootstrap.admin.enabled=false` so tests fully control their own fixtures.

**Test inventory**

| Suite | Type | Focus |
|-------|------|-------|
| `BackendApplicationTests` | Integration | Context loads; actuator unreachable while disabled |
| `config/AdminBootstrapTest` | Unit (Mockito) | All four bootstrap guard branches |
| `controller/AuthControllerIT` | End-to-end | Register/login, role escalation rejected, token usability |
| `controller/ShipmentWorkflowIT` | End-to-end | Creation, sender forgery, listing scope per role, status rules, deletion |
| `controller/DriverVehicleIT` | End-to-end | Driver creation/status, vehicle CRUD, assign/unassign pairing rules |
| `controller/TrackingIT` | End-to-end | Event creation, status sync, `actualDelivery`, driver ownership, pagination |
| `controller/PublicTrackingIT` | End-to-end | Anonymous access, PII redaction, 404 envelope, tenant isolation |
| `controller/UserAdminIT` | End-to-end | User CRUD, password never returned, dashboard stats |
| `controller/NotificationIT` | End-to-end | Per-user isolation, unread counts, mark as read |
| `security/AuthorizationIT` | End-to-end | **RBAC regression suite** — anonymous 401, malformed/forged/deleted-user tokens, per-role access |
| `service/impl/*Test` | Unit (Mockito) | Business rules per service |
| `service/CustomUserDetailsServiceTest` | Unit | Authority mapping and disabled flag |
| `util/JwtUtilTest` | Unit | Generate/extract/validate, expiry, tampering |

---

## API Reference

**Base URL:** `http://localhost:8080`
**Interactive docs:** Swagger UI at `/swagger-ui.html`, OpenAPI JSON at `/api-docs`
**Auth header:** `Authorization: Bearer <jwt>` (except endpoints marked *public*)

### Response Envelope

Single-resource and mutating endpoints return the resource or DTO directly. Errors — and the
`DELETE` operations — always use the envelope:

```json
{ "success": true, "message": "Shipment deleted successfully", "data": null }
```

List endpoints return Spring Data's `Page` shape:

```json
{
  "content": [ /* items */ ],
  "totalElements": 42, "totalPages": 5, "number": 0, "size": 10,
  "first": true, "last": false, "numberOfElements": 10, "empty": false
}
```

### Pagination & Sorting

Paginated endpoints accept standard Spring Data query parameters:

| Parameter | Default | Notes |
|-----------|---------|-------|
| `page` | `0` | Zero-based page index |
| `size` | `20` (controllers), `10` (SPA) | Items per page |
| `sort` | varies | e.g. `createdAt,desc`, `id,asc`, `timestamp,desc` |

The SPA's `unwrapPage()` helper reads `content`, `totalElements`, and `totalPages`.

### Authentication

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| `POST` | `/api/auth/register` | **public** | Register. Self-registration is **limited to `CUSTOMER`**; `ADMIN`/`DISPATCHER`/`DRIVER` are rejected with 400. Returns `201` + `AuthResponse`. |
| `POST` | `/api/auth/login` | **public** | Authenticate and receive a JWT. Returns `200` + `AuthResponse`; invalid credentials return `401`. |

**`RegisterRequest`**

| Field | Validation |
|-------|-----------|
| `email` | `@NotBlank`, `@Email` |
| `password` | `@NotBlank`, `@Size(min = 6)` |
| `firstName` | `@NotBlank` |
| `lastName` | `@NotBlank` |
| `phoneNumber` | optional |
| `role` | optional; only `CUSTOMER` accepted |

**`LoginRequest`** — `email` (`@NotBlank`, `@Email`), `password` (`@NotBlank`)

**`AuthResponse`** — `token`, `type` (`Bearer`), `id`, `email`, `firstName`, `lastName`, `role`,
`phoneNumber`

### Shipments

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| `POST` | `/api/shipments` | `CUSTOMER`, `DISPATCHER`, `ADMIN` | Create a shipment (`201`). Customers must be the sender. |
| `GET` | `/api/shipments` | authenticated | Paginated list, **scoped by role** (see below) |
| `GET` | `/api/shipments/{id}` | authenticated | Single shipment; ownership enforced |
| `GET` | `/api/shipments/tracking/{trackingNumber}` | `ADMIN`/`DISPATCHER`/`DRIVER`/`CUSTOMER` | Full details by tracking number |
| `GET` | `/api/shipments/public/tracking/{trackingNumber}` | **public** | Redacted tracking projection (no PII) |
| `GET` | `/api/shipments/status/{status}` | authenticated | Filter by `ShipmentStatus`, role-scoped |
| `GET` | `/api/shipments/driver/{driverId}` | `ADMIN`, `DISPATCHER` | Non-paginated list for one driver. A `DRIVER` is refused by design (they cannot enumerate another driver's work) — a driver wanting their own list uses `GET /api/shipments`, which is role-scoped |
| `DELETE` | `/api/shipments/{id}` | `ADMIN` | Delete (cascades tracking events) |

> **There is no `PATCH /api/shipments/{id}/status`.** A shipment's status is derived exclusively from
> its journey history: every transition is recorded as a tracking event via `POST /api/tracking`.
> This guarantees the timeline and the shipment status can never disagree.

**Listing scope by role**

| Role | Sees |
|------|------|
| `ADMIN`, `DISPATCHER` | All shipments |
| `CUSTOMER` | Only where they are the sender **or** the receiver |
| `DRIVER` | Only shipments assigned to their driver profile |

**`ShipmentRequest`**

| Field | Validation |
|-------|-----------|
| `senderId`, `receiverId` | `@NotNull`; must differ |
| `originStreet`, `originCity`, `originState`, `originCountry`, `originZip` | `@NotBlank` |
| `destStreet`, `destCity`, `destState`, `destCountry`, `destZip` | `@NotBlank` |
| `weight` | optional; if present must be `> 0` |
| `description` | optional |
| `vehicleId` | optional; when supplied and that vehicle has a driver, the shipment is created `ASSIGNED` and linked to both |

**`ShipmentResponse`** — `id`, `trackingNumber`, `senderId`, `senderName`, `receiverId`,
`receiverName`, `driverId`, `driverName`, `vehicleId`, `vehiclePlate`, `vehicleDriverId`,
`vehicleDriverName`, `status`, the ten address fields, `weight`, `description`,
`estimatedDelivery`, `actualDelivery`, `createdAt`, `updatedAt`.

**`PublicTrackingResponse`** — `trackingNumber`, `status`, `originCity`, `originCountry`,
`destCity`, `destCountry`, `estimatedDelivery`, `actualDelivery`, `createdAt`, `events[]`.
Deliberately omits names, phone numbers, street addresses, weight, and internal ids.

### Drivers

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| `POST` | `/api/drivers/{userId}` | `ADMIN` | Create a driver profile. The user must have role `DRIVER` and must not already have a profile. |
| `GET` | `/api/drivers/me` | `DRIVER`, `ADMIN`, `DISPATCHER` | The signed-in user's own driver profile (404 if none) |
| `GET` | `/api/drivers/{id}` | `ADMIN`/`DISPATCHER`; a `DRIVER` may read only their own | Driver by id |
| `GET` | `/api/drivers` | `ADMIN`, `DISPATCHER` | Paginated list |
| `GET` | `/api/drivers/available` | `DISPATCHER`, `ADMIN` | Paginated list of `AVAILABLE` drivers with no vehicle |
| `PATCH` | `/api/drivers/{id}/status` | `DISPATCHER`, `ADMIN` | Update status (JSON body, not a raw string) |
| `DELETE` | `/api/drivers/{id}` | `ADMIN` | Delete |

**`DriverStatusUpdateRequest`** — `status` (`@NotNull`, `DriverStatus`).
Setting `INACTIVE` while a vehicle is attached returns 400.

**`DriverResponse`** — `id`, `licenseNumber`, `userId`, `userName`, `email`, `phoneNumber`,
`status`, `vehicleId`, `vehiclePlate`, `createdAt`, `updatedAt`.

### Vehicles

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| `POST` | `/api/vehicles` | `ADMIN` | Create (`201`). `driverId` is optional; assigning one forces `IN_USE` and sets the driver `ON_TRIP`. |
| `GET` | `/api/vehicles/{id}` | `ADMIN`/`DISPATCHER`/`DRIVER` | Vehicle by id |
| `GET` | `/api/vehicles` | `ADMIN`, `DISPATCHER` | Paginated list |
| `GET` | `/api/vehicles/available` | `DISPATCHER`, `ADMIN` | Only `AVAILABLE` |
| `GET` | `/api/vehicles/assignable` | `DISPATCHER`, `ADMIN` | `AVAILABLE` **or** `IN_USE` — the set usable for dispatch |
| `PUT` | `/api/vehicles/{id}` | `ADMIN` | Partial update (only non-null fields are applied) |
| `POST` | `/api/vehicles/{vehicleId}/assign/{driverId}` | `DISPATCHER`, `ADMIN` | Pair a driver with a vehicle |
| `DELETE` | `/api/vehicles/{vehicleId}/unassign` | `DISPATCHER`, `ADMIN` | Break the pairing; both return to `AVAILABLE` |
| `DELETE` | `/api/vehicles/{id}` | `ADMIN` | Delete |

**`VehicleRequest`** — `plateNumber` (`@NotBlank`, unique), `model` (`@NotBlank`),
`vehicleType` (`@NotBlank`), `capacity` (`@NotNull`, `> 0`), `status` (`@NotNull`), `driverId`
(optional). A vehicle created without a driver cannot be `IN_USE`.

**`VehicleResponse`** — `id`, `plateNumber`, `model`, `vehicleType`, `status`, `capacity`,
`driverId`, `driverName`, `createdAt`, `updatedAt`.


### Users

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| `GET` | `/api/users` | `ADMIN` | Paginated list |
| `GET` | `/api/users/lookup` | **any authenticated user** | Full (non-paginated) summary list for sender/receiver dropdowns |
| `GET` | `/api/users/{id}` | `ADMIN` | User by id |
| `GET` | `/api/users/role/{role}` | `ADMIN` | Paginated filter by role |
| `POST` | `/api/users` | `ADMIN` | Create a user with **any** role (defaults to `CUSTOMER`) |
| `PUT` | `/api/users/{id}` | `ADMIN` | Update profile / role / enabled |
| `DELETE` | `/api/users/{id}` | `ADMIN` | Delete; deleting your own account returns 400 |

**`UserUpdateRequest`** — `email` (`@NotBlank`, `@Email`), `firstName` (`@NotBlank`),
`lastName` (`@NotBlank`), `phoneNumber`, `role` (`@NotNull`), `enabled` (`@NotNull`).

**`UserSummaryResponse`** — `id`, `firstName`, `lastName`, `email`, `role`, `phoneNumber`,
`enabled`. **`password` is never returned.**

### Tracking

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| `POST` | `/api/tracking` | `ADMIN`, `DISPATCHER`, `DRIVER` | Append an event (`201`). A `DRIVER` may only add events to shipments assigned to them. |
| `GET` | `/api/tracking/shipment/{shipmentId}` | authenticated | Full history, newest first |
| `GET` | `/api/tracking/shipment/{shipmentId}/page` | authenticated | Paginated history |

**Side effects (this is the only way a shipment status changes):** the event's status is applied to
the shipment — `IN_TRANSIT` moves it to `IN_TRANSIT`, `DELIVERED` sets `DELIVERED` **and** stamps
`actualDelivery`, and `PENDING` / `ASSIGNED` / `CANCELLED` are applied as-is. `ASSIGNED` is rejected
with 400 unless both a driver and a vehicle are attached.

**`TrackingEventRequest`** — `shipmentId` (`@NotNull`), `status` (`@NotNull`, `ShipmentStatus`),
`location` (`@NotBlank`), `description` (optional).

**`TrackingEventResponse`** — `id`, `shipmentId`, `status`, `location`, `description`, `timestamp`.

### Dashboard

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| `GET` | `/api/dashboard/stats` | `ADMIN`, `DISPATCHER` | Aggregate counts for the dashboard |

**`DashboardStatsResponse`** — `totalShipments`, `pendingShipments`, `inTransitShipments`,
`deliveredShipments`, `totalUsers`, `totalDrivers`, `totalVehicles`, and `shipmentsByStatus`
(a map of every `ShipmentStatus` name → count).

### Notifications

All notification endpoints are **per-user**: an `ADMIN` may access any user's notifications, while
every other role may only access their own (otherwise 403).

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| `POST` | `/api/notifications/{userId}?title=…&message=…` | `ADMIN` | Create (`201`). `title` and `message` are **query parameters**. |
| `GET` | `/api/notifications/{userId}` | owner / `ADMIN` | Paginated list |
| `GET` | `/api/notifications/unread/{userId}` | owner / `ADMIN` | Non-paginated unread list |
| `GET` | `/api/notifications/unread/{userId}/page` | owner / `ADMIN` | Paginated unread list |
| `GET` | `/api/notifications/unread-count/{userId}` | owner / `ADMIN` | Raw number of unread notifications |
| `PATCH` | `/api/notifications/{notificationId}/read/{userId}` | owner / `ADMIN` | Mark one as read |
| `PATCH` | `/api/notifications/read-all/{userId}` | owner / `ADMIN` | Mark all as read |

**`NotificationResponse`** — `id`, `userId`, `title`, `message`, `read`, `createdAt`.

### Quick cURL Walkthrough

```bash
BASE=http://localhost:8080

# 1. Log in as the bootstrapped administrator
TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@slp.com","password":"admin123"}' | jq -r .token)

# 2. Register a customer
curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"cust@slp.com","password":"Secret123!","firstName":"Cara","lastName":"Stone"}'

# 3. Create a shipment (senderId / receiverId are user ids)
curl -s -X POST "$BASE/api/shipments" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"senderId":2,"receiverId":3,
       "originStreet":"1 Dock Rd","originCity":"Karachi","originState":"Sindh",
       "originCountry":"PK","originZip":"74000",
       "destStreet":"9 Harbor St","destCity":"Dubai","destState":"DXB",
       "destCountry":"AE","destZip":"00000","weight":12.5,"description":"Fragile"}'

# 4. Public tracking — no token required (use the trackingNumber from step 3)
curl -s "$BASE/api/shipments/public/tracking/SLP-XXXXXXXX"
```

---

## Frontend Documentation

### Frontend Overview

The frontend is a single-page application built with React 19 and Vite 8, styled with Material UI 7.
It renders a role-aware application shell (collapsible sidebar, breadcrumb top bar, toast feedback),
guards routes on both authentication and role, and talks to the backend through one shared Axios
instance.

Design goals visible throughout the code:

- **No hardcoded URLs** — the API base URL resolves from `VITE_API_URL`, otherwise same-origin.
- **No silent failures** — every mutation reports success or failure through `FeedbackProvider`
  toasts, and pages render explicit loading / empty / error states.
- **No duplicated styling values** — all colours, gradients, and layout constants live in
  `theme/tokens.js`.
- **Resilient bootstrap** — an inline splash in `index.html` prevents a white flash before React
  mounts, and a top-level `ErrorBoundary` converts render crashes into a recovery screen.

### Source Layout

```
src/
├── main.jsx                 # createRoot + StrictMode
├── App.jsx                  # Provider stack + route table
├── index.css                # Global reset, print styles, focus rings, a11y
├── components/              # 16 shared presentational/behavioural components
├── constants/index.js       # Enums, status colours, pagination defaults, humanize()
├── context/AuthContext.jsx  # Session state, login/register/logout, role helpers
├── pages/                   # 15 route-level screens
├── services/                # api.js (Axios) + 8 domain API modules
├── theme/
│   ├── tokens.js            # BRAND, DOMAIN_COLORS, GRADIENTS, LAYOUT, storage keys
│   ├── index.js             # createAppTheme(mode) MUI theme factory
│   └── ColorModeContext.jsx # Light/dark provider + toggle
└── utils/format.js          # Error extraction, date/weight formatting, unwrapPage
```

### Provider Stack

`App.jsx` nests providers so that each layer can rely on the one above it:

```
ErrorBoundary            → catches render-time crashes
└── ColorModeProvider    → MUI ThemeProvider + CssBaseline (light/dark)
    └── FeedbackProvider → Snackbar/Alert toast queue + useFeedback()
        └── AuthProvider → session state, role helpers
            └── Router   → BrowserRouter + <AppRoutes />
```

`AppRoutes` blocks rendering behind a centred `LoadingState` while `AuthContext` restores the
session, then computes the role-appropriate landing route.

### Routing & Access Control

**Public routes** (no account required)

| Path | Component | Notes |
|------|-----------|-------|
| `/login` | `Login` | Redirects to the role default route if already signed in |
| `/register` | `Register` | CUSTOMER-only self sign-up; redirects if signed in |
| `/track` | `TrackingPublic` | Anonymous parcel lookup form |
| `/track/:trackingNumber` | `TrackingPublic` | Deep link straight to a tracking number |
| `/unauthorized` | `Unauthorized` | 403 landing page with a route back |

**Protected routes** (wrapped in `PrivateRoute` with `allowedRoles`)

| Path | Roles | Component |
|------|-------|-----------|
| `/` | all | `Layout` shell; index redirects to the role default |
| `/dashboard` | `ADMIN`, `DISPATCHER` | `Dashboard` |
| `/shipments` | all | `Shipments` |
| `/shipments/create` | `ADMIN`, `DISPATCHER`, `CUSTOMER` | `ShipmentCreate` |
| `/shipments/:id` | all | `ShipmentDetail` |
| `/tracking` | `ADMIN`, `DISPATCHER`, `DRIVER` | `Tracking` |
| `/drivers` | `ADMIN`, `DISPATCHER` | `Drivers` |
| `/vehicles` | `ADMIN`, `DISPATCHER` | `Vehicles` |
| `/users` | `ADMIN` | `Users` |
| `/notifications` | all | `Notifications` |
| `*` (inside shell) | all | `NotFound` |

**Default landing route**

| Role | Lands on |
|------|----------|
| `ADMIN`, `DISPATCHER` | `/dashboard` |
| `DRIVER`, `CUSTOMER` | `/shipments` |

An unmatched top-level path redirects to `/login`.

**Guard components**

| Component | Behaviour |
|-----------|-----------|
| `PrivateRoute` | Renders nothing while the session restores (avoids a login flash), redirects anonymous visitors to `/login` (preserving `state.from`), and sends wrong-role users to `/unauthorized` |
| `RoleGate` | Inline role check for use *inside* a page; redirects to `/unauthorized` when the role is not allowed |

> Client-side guards are **UX only**. The server independently authorizes every request; the UI
> mirrors those rules so users are not shown actions that would fail.

### Session & Authentication

`context/AuthContext.jsx` owns all session state and exposes a single hook, `useAuth()`.

**Persisted keys** (both in `localStorage`)

| Key | Contents |
|-----|----------|
| `slp.token` | Raw JWT (`TOKEN_STORAGE_KEY`) |
| `slp.user` | JSON of the `AuthResponse` (`USER_STORAGE_KEY`) |

**Restoration logic** — `readStoredSession()` runs synchronously on mount:

1. Both keys must be present, otherwise there is no session.
2. `slp.user` must parse and contain both `id` and `role` (a token without these cannot drive role
   gating).
3. Corrupt JSON clears both keys and yields no session.

There is deliberately **no server round-trip on boot** — the JWT carries the identity, and an
expired token is rejected by the Axios interceptor on first use.

**API exposed by `useAuth()`**

| Member | Description |
|--------|-------------|
| `user` | The stored session object (or `null`) |
| `loading` | `true` until restoration completes |
| `login(email, password)` | Calls `authService.login`, persists the session |
| `register(userData)` | Calls `authService.register`, persists the session |
| `logout()` | Clears both storage keys and the in-memory user |
| `hasRole(roles)` | `true` if the user's role is in the array (or equals the single value) |
| `isAdmin()` | `ADMIN` |
| `isDispatcher()` | `ADMIN` or `DISPATCHER` |
| `isDriver()` | `ADMIN` or `DRIVER` |
| `isCustomer()` | `ADMIN`, `CUSTOMER`, or `DISPATCHER` |

`useAuth()` throws a descriptive error if used outside `<AuthProvider>`.

### HTTP Layer

`services/api.js` exports one configured Axios instance (the default export) plus the two storage-key
constants. Each domain module wraps it.

**Base URL resolution**

| Priority | Source | Result |
|----------|--------|--------|
| 1 | `VITE_API_URL` | Explicit override (Docker / CI builds) |
| 2 | *(unset)* | `''` → same origin; Nginx proxies `/api` in production, Vite proxies it in dev |

`localhost` is never hardcoded — doing so would break Docker, `vite preview`, and any non-local
deployment.

**Instance configuration** — `timeout: 30000`; headers `Content-Type: application/json` and
`Accept: application/json`.

**Request interceptor** — reads `slp.token` from `localStorage` and, when present, sets
`config.headers.Authorization = 'Bearer <token>'`.

**Response interceptor**

| Condition | Behaviour |
|-----------|-----------|
| URL is `/api/auth/login` or `/api/auth/register` | Rejects immediately, so a failed login renders on the form instead of redirecting |
| `401` | Clears `slp.token` + `slp.user` and navigates to `/login` (unless already there) |
| `403` and the URL is **not** in `IN_PLACE_FORBIDDEN_ENDPOINTS` | Navigates to `/unauthorized` |
| `403` and the URL *is* `/api/shipments` or `/api/tracking` | Surfaces the error **in place** |

> The in-place list exists because the backend uses 403 for business-rule rejections as well as for
> missing roles. A blanket redirect used to yank users off a half-completed shipment form and lose
> their input.

**Domain service modules**

| Module | Base path | Methods |
|--------|-----------|---------|
| `authService.js` | `/api/auth` | `login`, `register` |
| `shipmentService.js` | `/api/shipments` | `create`, `getAll`, `getById`, `getByTrackingNumber`, `getPublicTracking`, `getByStatus`, `getByDriver`, `delete` |
| `driverService.js` | `/api/drivers` | `getAll`, `getAvailable`, `getById`, `getMine`, `create`, `updateStatus`, `delete` |
| `vehicleService.js` | `/api/vehicles` | `create`, `getAll`, `getAssignable`, `getById`, `update`, `assignDriver`, `unassignDriver`, `delete` |
| `userService.js` | `/api/users` | `getAll`, `getById`, `getByRole`, `getLookup`, `create`, `update`, `delete` |
| `trackingService.js` | `/api/tracking` | `createEvent`, `getByShipmentId`, `getByShipmentIdPage` |
| `dashboardService.js` | `/api/dashboard` | `getStats` |
| `notificationService.js` | `/api/notifications` | `create`, `getByUserId`, `getUnread`, `getUnreadCount`, `markAsRead`, `markAllAsRead` |

Each module returns `response.data` so callers work with the payload directly. Paginated calls build
query strings with `URLSearchParams` (`page`, `size`, `sort`).


### Design System & Theming

**`theme/tokens.js`** — the single source of truth for visual constants.

| Export | Contents |
|--------|----------|
| `BRAND` | `primary` (`#1565c0` / light `#5e92f3` / dark `#003c8f`) and `secondary` (`#00897b` / `#4ebaaa` / `#005b4f`) |
| `DOMAIN_COLORS` | Hex colours per domain status: `shipment`, `vehicle`, `driver`, `role` |
| `CHART_FALLBACK_COLORS` | 7-colour fallback palette for charts with unknown series counts |
| `GRADIENTS` | `brand`, `brandDark` (hero surfaces) and `surface` (subtle page wash) |
| `LAYOUT` | `drawerWidth: 268`, `drawerCollapsedWidth: 76`, `topBarHeight: 64`, `contentMaxWidth: 'xl'` |
| `COLOR_MODE_STORAGE_KEY` | `slp.colorMode` |

**Domain status colours** (shared by `StatusChip` and the dashboard charts)

| Domain | Values |
|--------|--------|
| `shipment` | `PENDING` `#ed6c02` · `ASSIGNED` `#0288d1` · `IN_TRANSIT` `#1565c0` · `DELIVERED` `#2e7d32` · `CANCELLED` `#d32f2f` |
| `vehicle` | `AVAILABLE` `#2e7d32` · `IN_USE` `#0288d1` · `MAINTENANCE` `#ed6c02` |
| `driver` | `AVAILABLE` `#2e7d32` · `ON_TRIP` `#0288d1` · `INACTIVE` `#757575` |
| `role` | `ADMIN` `#d32f2f` · `DISPATCHER` `#ed6c02` · `DRIVER` `#0288d1` · `CUSTOMER` `#616161` |

**`theme/index.js`** — `createAppTheme(mode)` builds the MUI theme for `'light'` or `'dark'` from
those tokens, so the two schemes can never drift.

| Aspect | Light | Dark |
|--------|-------|------|
| `background.default` / `paper` | `#f4f6fb` / `#ffffff` | `#0b1220` / `#131c2e` |
| `text.primary` / `secondary` | `#152238` / `#5b6b86` | `#e8edf7` / `#9aa8c0` |
| `divider` | `rgba(21,34,56,0.10)` | `rgba(255,255,255,0.09)` |

Notable component overrides: `borderRadius: 10` shape; Inter-first font stack; elevation-less
buttons / cards / paper / app bar; small outlined text fields by default; uppercase, non-wrapping
table headers; a dark gradient drawer (`#0d2b52` light / `#0d1526` dark); 14 px dialog radius; and a
wave skeleton animation. The theme also paints the fixed background gradient and custom scrollbars,
and re-exports `LAYOUT`.

**`theme/ColorModeContext.jsx`** — resolves the initial mode from `slp.colorMode`, falling back to
`prefers-color-scheme: dark`, and defaults to light. It provides `{ mode, toggle, setMode }`, wraps
children in `ThemeProvider` + `CssBaseline`, persists the choice (best-effort, in a `try/catch`), and
keeps `document.documentElement.style.colorScheme` in sync so native controls follow the theme.
Consumed via `useColorMode()`.

**`index.css`** — global reset, `100%` height chain, iOS text-size fix, a `--slp-topbar-height`
variable, a print stylesheet (hides nav / app bar / drawer / pagination / toasts, forces black on
white and full-width tables for dispatch paperwork), `prefers-reduced-motion` handling, a visible
`:focus-visible` ring, and `forced-colors` borders for high-contrast mode.

**`index.html`** — declares light/dark `theme-color` meta tags, a `color-scheme` hint, a
`noindex, nofollow` robots directive, inline first-paint styles, a spinner splash element that React
replaces on mount, and a `<noscript>` fallback explaining that JavaScript is required.

### Shared Components

| Component | Purpose |
|-----------|---------|
| `Layout` | App shell. Permanent collapsible drawer on desktop (persisted to `slp.sidebarCollapsed`), temporary overlay drawer on mobile; renders `<Outlet />` in a max-width container plus a footer |
| `Sidebar` | Primary navigation in three sections — **Operations** (Dashboard, Shipments, Tracking), **Fleet** (Drivers, Vehicles), **Administration** (Users, Notifications). Each item declares the roles that may see it, mirroring the route guards. Collapsed mode keeps every control reachable via tooltips; exports `DRAWER_WIDTH` / `DRAWER_COLLAPSED_WIDTH` |
| `TopBar` | Breadcrumb trail derived from the URL, light/dark toggle, unread-notification badge, and the user avatar menu with sign-out. Polls `unread-count` every 60 s and reports a polling failure **once** per outage instead of silently |
| `PrivateRoute` | Auth + role route guard (see [Routing](#routing--access-control)) |
| `RoleGate` | Inline role guard for page-level sections |
| `AuthLayout` / `AuthBrandMark` | Split marketing-panel layout for the login/register screens, with a compact brand mark for narrow viewports |
| `PageHeader` | Consistent page title, subtitle, breadcrumb / back affordance, and action slot |
| `SectionCard` / `DetailItem` | Titled content card; `DetailItem` renders a labelled value in a responsive grid |
| `StatCard` | Dashboard KPI tile with icon, colour accent, hint text, optional click-through, and a skeleton state |
| `StatusChip` | Colour-aware status pill driven by `DOMAIN_COLORS`, with a neutral fallback for unknown values |
| `SearchInput` | Debounced search field used across list pages |
| `ConfirmDialog` | Reusable destructive-action confirmation dialog |
| `StateFeedback` | Exports `LoadingState`, `InlineLoading` (thin progress bar for background refreshes), `TableSkeleton`, `CardGridSkeleton`, `EmptyState` (with optional call to action), and `ErrorState` |
| `FeedbackProvider` / `useFeedback` | Application-wide toast queue (`notifySuccess`, `notifyError`, `notifyInfo`, `notifyWarning`) with a 5 s auto-hide |
| `ErrorBoundary` | Class component catching render errors; shows a branded recovery screen with Reload / Sign-in actions and logs to the console (stack trace only in dev) |


### Pages

| Page | Route | Behaviour |
|------|-------|-----------|
| `Login` | `/login` | Email/password form with a show-password toggle; on success redirects to the role default (or back to the originally requested path). Failures render inline via `getErrorMessage` |
| `Register` | `/register` | CUSTOMER-only sign-up with a 0–4 password-strength meter and inline validation. The role selector was intentionally removed — privileged accounts are created by an admin |
| `Dashboard` | `/dashboard` | KPI tiles (total / pending / in-transit / delivered shipments, users, drivers, vehicles), a bar/pie toggle for `shipmentsByStatus`, a share breakdown, and manual refresh with a silent background refresh path |
| `Shipments` | `/shipments` | Paginated table with search, status filter, page-size selector, row actions (view / track / delete), and a "New shipment" action shown only to `ADMIN` / `DISPATCHER` / `CUSTOMER` |
| `ShipmentCreate` | `/shipments/create` | Booking form for sender/receiver (populated from `/api/users/lookup`), full origin/destination address blocks, weight, description, and an optional vehicle. Customers are pinned to themselves as sender; staff may pick anyone |
| `ShipmentDetail` | `/shipments/:id` | Full shipment view with `DetailItem` panels, a paginated tracking timeline, and an "Add event" dialog for `ADMIN` / `DISPATCHER` / `DRIVER`. That dialog is the **only** way to change a shipment's status |
| `Tracking` | `/tracking` | Tracking management. The shipment picker is populated from `GET /api/shipments`, which the server scopes by role — so an `ADMIN` / `DISPATCHER` sees every shipment and a `DRIVER` sees only their own assignments, with no role branching in the UI. The selected shipment is mirrored into the `shipmentId` query parameter so the view is shareable |
| `TrackingPublic` | `/track`, `/track/:trackingNumber` | Anonymous lookup using the redacted public endpoint. Shows a status stepper, origin/destination summary, and the event table; supports `?trackingNumber=` deep links |
| `Drivers` | `/drivers` | Paginated driver table with search, status chips, a status-change dialog, driver-profile creation for an existing `DRIVER` user, and delete (ADMIN only) |
| `Vehicles` | `/vehicles` | Paginated vehicle table with search, status chips, a create/edit dialog, driver assign/unassign, and delete (ADMIN only) |
| `Users` | `/users` | Paginated user table with search, role filter, create/edit dialog (role + enabled switch), and delete. Self-deletion is blocked with a toast |
| `Notifications` | `/notifications` | Paginated notification list, unread badge, mark-one / mark-all as read, and (ADMIN only) a compose dialog that posts to another user |
| `Unauthorized` | `/unauthorized` | 403 screen explaining that the role lacks access, with a route back and a sign-out option |
| `NotFound` | `*` inside the shell | 404 screen aware of whether a user is signed in |

### Utilities & Constants

**`utils/format.js`**

| Helper | Behaviour |
|--------|-----------|
| `getErrorMessage(error, fallback)` | Prefers per-field validation messages from `error.response.data.data` (joined as `field: message` lines), then `data.message`, then distinguishes timeout (`ECONNABORTED`) and unreachable-server cases, and finally falls back to the supplied default |
| `formatDateTime(value)` | Locale date + time, `—` for null / invalid |
| `formatDate(value)` | Locale date only, `—` for null / invalid |
| `orDash(value)` | `—` for `null` / `undefined` / `''` |
| `formatWeight(value)` | Thousands-separated value with a `kg` suffix, `—` when absent |
| `unwrapPage(data)` | Normalises a Spring `Page` into `{ content, totalElements, totalPages }` with safe defaults |

**`constants/index.js`**

| Export | Contents |
|--------|----------|
| `ShipmentStatus` | `PENDING`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED` |
| `VehicleStatus` | `AVAILABLE`, `IN_USE`, `MAINTENANCE` |
| `DriverStatus` | `AVAILABLE`, `ON_TRIP`, `INACTIVE` |
| `UserRole` | `ADMIN`, `CUSTOMER`, `DRIVER`, `DISPATCHER` |
| `SHIPMENT_STATUSES`, `DRIVER_STATUSES`, `VEHICLE_STATUSES`, `USER_ROLES` | Array forms for `Select` options |
| `SHIPMENT_STATUS_COLORS`, `VEHICLE_STATUS_COLORS`, `DRIVER_STATUS_COLORS`, `USER_ROLE_COLORS` | MUI colour names per status |
| `SHIPMENT_STATUS_MUI_COLOR` | MUI colour name per shipment status |
| `STATUS_DOMAIN` | Domain keys (`shipment`, `vehicle`, `driver`, `role`) for `StatusChip` |
| `PAGE_SIZE_OPTIONS` | `[5, 10, 25, 50]` |
| `DEFAULT_PAGE_SIZE` | `10` |
| `humanize(value)` | `IN_TRANSIT` → `In Transit` |
| `statusLabel(value)` | `humanize` with an `'Unknown'` fallback for null / undefined |

> The frontend enums **mirror** the backend enums (`com.slp.backend.entity.*`) by string value. When
> you add a status server-side, add it here too or `StatusChip` will fall back to its neutral colour.


---

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PROFILE` | `dev` | Active Spring profile |
| `SERVER_PORT` | `8080` | HTTP port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `slp_db` | Database name |
| `DB_USERNAME` | `postgres` | Database user |
| `DB_PASSWORD` | `mysecretpassword` | Database password |
| `DB_POOL_MAX_SIZE` | `10` | HikariCP maximum pool size |
| `DB_POOL_MIN_IDLE` | `5` | HikariCP minimum idle connections |
| `JPA_DDL_AUTO` | `validate` | Hibernate schema mode (`validate` does not create tables) |
| `JPA_SHOW_SQL` | `true` | Log SQL statements |
| `JPA_FORMAT_SQL` | `true` | Pretty-print logged SQL |
| `JWT_SECRET` | dev default | **Required in production.** Must be ≥ 32 bytes |
| `JWT_EXPIRATION` | `86400000` | Token lifetime in milliseconds (24 h) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated allowed origin patterns |
| `ACTUATOR_ENABLED` | `false` | Expose `/actuator/**` (health/info public, the rest ADMIN-only) |
| `ERROR_INCLUDE_MESSAGE` | `always` | Include `message` in Spring's error payload |
| `ERROR_INCLUDE_BINDING_ERRORS` | `always` | Include binding errors |
| `APP_BOOTSTRAP_ADMIN_ENABLED` | `true` | Seed a first admin on an empty database |
| `APP_BOOTSTRAP_ADMIN_EMAIL` | `admin@slp.com` | Bootstrapped admin email |
| `APP_BOOTSTRAP_ADMIN_PASSWORD` | `admin123` | Bootstrapped admin password — **must be overridden in production** |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | *(empty)* | API base URL. Empty means same-origin (dev proxy / Nginx). Set explicitly for a cross-origin backend |
| `VITE_PROXY_TARGET` | `http://localhost:8080` | **Dev-server only.** Target for the Vite `/api` and `/api-docs` proxy |

> `VITE_*` variables are inlined at **build** time, not read at runtime — changing `VITE_API_URL`
> requires rebuilding the frontend image.

---

## Docker & Deployment

### Compose Topology

```
docker compose up --build
```

| Service | Image / build | Ports | Notes |
|---------|---------------|-------|-------|
| `postgres` | `postgres:15-alpine` | `5432:5432` | Health-checked with `pg_isready`; data in the `postgres_data` volume |
| `backend` | `./backend/Dockerfile` | `8080:8080` | `SPRING_PROFILES_ACTIVE=prod`; starts only after Postgres is healthy; `restart: unless-stopped` |
| `frontend` | `./frontend/Dockerfile` | `80:80` | Nginx-served static build; starts after the backend |

All three share the `slp-network` bridge network. The compose file reads `DB_PASSWORD`,
`JWT_SECRET`, and `CORS_ALLOWED_ORIGINS` from the environment (`.env` or exported shell variables)
with sensible fallbacks — except `JWT_SECRET`, which has no fallback and must be supplied.

### Backend Image

Two stages: `maven:3.9-eclipse-temurin-17` builds with `mvn clean package -DskipTests`, then the jar
is copied into `eclipse-temurin:17-jre-alpine`. The image runs
`java -Djarmode=layertools -jar app.jar extract` to produce Spring Boot's layered layout for
efficient caching, creates a non-root `slp` user (UID 1001), and starts via
`java org.springframework.boot.loader.launch.JarLauncher`.

### Frontend Image

`node:20-alpine` runs `npm ci` then `npm run build`, and the resulting `dist/` is copied into
`nginx:1.27-alpine` along with `nginx.conf`. The container runs as the non-root `slp` user (UID
1001) on port 80.

### Nginx Configuration

| Location | Behaviour |
|----------|-----------|
| `/` | `try_files $uri $uri/ /index.html` — SPA history fallback so deep links like `/shipments/42` work |
| `/api/` | `proxy_pass http://backend:8080/api/` with `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` headers |
| `/api-docs/` | `proxy_pass http://backend:8080/api-docs/` |

Because Nginx serves the SPA and the API from one origin, the browser never makes a cross-origin
request, so `CORS_ALLOWED_ORIGINS` only matters for separate-origin deployments.

### Production Hardening Checklist

- [ ] Set a strong, randomly generated `JWT_SECRET` (≥ 32 bytes).
- [ ] Set `APP_BOOTSTRAP_ADMIN_ENABLED=false` after the first successful boot.
- [ ] Override `APP_BOOTSTRAP_ADMIN_PASSWORD` if the bootstrap must run in `prod`.
- [ ] Change the default admin password immediately after signing in.
- [ ] Keep `JPA_DDL_AUTO=validate` (the default) so schema drift fails fast.
- [ ] Set `JPA_SHOW_SQL=false` to stop logging SQL in production.
- [ ] Set `CORS_ALLOWED_ORIGINS` to the real frontend origin(s) — never a wildcard.
- [ ] Terminate TLS in front of Nginx (`server.http2.enabled` and compression are already on).
- [ ] Keep `ACTUATOR_ENABLED=false` unless you need health probes, and protect them accordingly.



---

## Development Conventions

**Backend**

- Constructor injection only — no field injection (`@RequiredArgsConstructor` for Lombok-based
  services, explicit constructors for controllers and config).
- DTOs at the boundary; entities never leave the service layer. Response DTOs are built in a private
  `mapToResponse` / `mapToSummary` method inside the service implementation.
- Every controller method carries `@PreAuthorize` **and** `@Operation` (OpenAPI). Role checks are
  the coarse gate; ownership checks live in the service.
- Mutating service methods are `@Transactional`; read-only ones use `@Transactional(readOnly = true)`.
- Throw `ResourceNotFoundException` (404), `BadRequestException` (400), or `UnauthorizedException`
  (403, business-rule rejection). Never throw raw exceptions — the global handler owns the contract.
- Prefer derived query methods (`findByStatusAndVehicleIsNull`) over hand-written JPQL.
- JavaDoc on non-obvious decisions documents the *why* (client-visible failure semantics, ownership
  rules, guard rails) more often than the *what*.

**Frontend**

- Function components with hooks only; one default export per component file, named exports for
  auxiliary pieces (`DetailItem`, `AuthBrandMark`, `DRAWER_WIDTH`).
- Pages own data fetching with `useCallback`-memoised loaders and explicit `loading` / `error` /
  `refreshing` state; mutations report through `useFeedback()`.
- Never hardcode a colour, gradient, radius, or layout size — read it from `theme/tokens.js`.
- Never hardcode an API URL — use the shared `api` instance.
- Mirror server-side rules in the UI (e.g. disabling `ASSIGNED` without a driver and vehicle) so
  users are not invited into a guaranteed 400.
- Keep `eslint.config.js` clean: `npm run lint`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Backend fails to start with a schema-validation error | `ddl-auto=validate` and the database has no tables (or has drifted) | Boot once with `JPA_DDL_AUTO=update`, then revert to `validate` |
| `401` immediately after signing in | Clock skew, expired token, or `JWT_SECRET` changed between restarts | Sign in again; keep `JWT_SECRET` stable across restarts |
| `403` on a page right after login | The account's role lacks access to that route | Check the role; the SPA should route to `/unauthorized` rather than break |
| Frontend shows "Cannot reach the server" | Backend not running, wrong `VITE_API_URL`, or wrong dev proxy target | Start the backend; check `VITE_PROXY_TARGET` |
| Docker: backend exits while Postgres starts | Postgres health check not yet passing | Compose already gates on `service_healthy`; inspect `docker compose logs postgres` |
| `WeakKeyException` from jjwt on startup | `JWT_SECRET` shorter than 32 bytes | Use a longer secret (`openssl rand -hex 32`) |
| Login fails with the default admin | Bootstrap disabled, an ADMIN already exists, or `prod` + default password was refused | Check the startup log for the `AdminBootstrap` warning |
| CORS error in the browser | Frontend and backend on different origins without a matching `CORS_ALLOWED_ORIGINS` entry | Add the frontend origin, or serve both behind the same reverse proxy |
| Notification badge reports a refresh failure | The unread-count poll failed (usually an expired token) | Sign in again; the badge reports one failure per outage by design |
| `npm run build` warns about chunk size | A new large dependency was added outside the manual chunks | Extend `build.rollupOptions.output.manualChunks` in `vite.config.js` |

---

## License

Backend API metadata declares **Apache License 2.0**. See
<https://www.apache.org/licenses/LICENSE-2.0>.
