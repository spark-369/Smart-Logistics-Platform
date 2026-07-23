# Smart Logistics Platform (SLP)

Smart Logistics Platform is a full-stack web application for managing shipments, drivers, vehicles, users, and real-time tracking. It provides role-based access for Admins, Dispatchers, Drivers, and Customers.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Backend Documentation](#backend-documentation)
- [Frontend Documentation](#frontend-documentation)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Docker Deployment](#docker-deployment)

---

## Architecture

The application follows a client-server architecture:

- **Backend**: Spring Boot REST API with JWT authentication, PostgreSQL database, and Spring Data JPA.
- **Frontend**: React SPA with Material UI, React Router, and Axios for API communication.
- **Communication**: JSON over HTTP with Bearer token authentication.

---

## Tech Stack

### Backend
- Java 17
- Spring Boot 4.1.0
- Spring Security + JWT (jjwt 0.12.6)
- Spring Data JPA
- PostgreSQL 15
- Lombok
- SpringDoc OpenAPI 2.7.0
- Maven

### Frontend
- React 19
- Vite 8
- Material UI (MUI) 7
- React Router DOM 7
- Axios 1.8
- Recharts 2.15
- ESLint

---

## Project Structure

```
v1/
├── backend/
│   ├── src/main/java/com/slp/backend/
│   │   ├── config/           # Security, JWT, Swagger config
│   │   ├── controller/       # REST controllers
│   │   ├── dto/              # Request/Response DTOs
│   │   ├── entity/           # JPA entities
│   │   ├── exception/        # Global exception handling
│   │   ├── repository/       # Spring Data JPA repositories
│   │   ├── service/          # Service interfaces + implementations
│   │   └── util/             # Utilities (JWT, constants)
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── logback-spring.xml
│   ├── pom.xml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── constants/        # Enums and constants
│   │   ├── context/          # React context (AuthContext)
│   │   ├── pages/            # Route-level page components
│   │   ├── services/         # API service modules
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Backend Documentation

### Overview
The backend is a Spring Boot application exposing REST APIs under `/api/**`. It uses JWT for stateless authentication and role-based access control (RBAC).

### Key Packages

- **`config`**: Security configuration (`SecurityConfig`), JWT filter (`JwtAuthFilter`), and Swagger config.
- **`controller`**: REST endpoints organized by domain (auth, shipments, drivers, vehicles, users, tracking, dashboard, notifications).
- **`dto`**: Request and response objects separating API contracts from entities.
- **`entity`**: JPA entities mapped to PostgreSQL tables.
- **`exception`**: Global exception handler and custom exceptions.
- **`repository`**: Spring Data JPA repositories.
- **`service`**: Business logic interfaces and implementations.
- **`util`**: JWT utility and application constants.

### Entities

| Entity | Description |
|--------|-------------|
| `User` | System user with role (ADMIN, CUSTOMER, DRIVER, DISPATCHER) |
| `Shipment` | Shipment record with origin/destination, status, and tracking events |
| `Driver` | Driver profile linked to a User |
| `Vehicle` | Vehicle record with plate number, model, capacity, and status |
| `TrackingEvent` | Tracking history entry for a shipment |
| `Notification` | Notification record for a user |

### Enums

- **`Role`**: ADMIN, CUSTOMER, DRIVER, DISPATCHER
- **`ShipmentStatus`**: PENDING, ASSIGNED, IN_TRANSIT, DELIVERED, CANCELLED
- **`VehicleStatus`**: AVAILABLE, IN_USE, MAINTENANCE

### Security

- Stateless JWT authentication via `JwtAuthFilter`.
- Passwords encoded with BCrypt (strength 12).
- Role-based access using `@PreAuthorize`.
- CORS configured via `app.cors.allowed-origins`.

### Configuration

Key properties in `application.properties`:

- `spring.profiles.active`: Profile (default `dev`).
- `spring.datasource.*`: PostgreSQL connection and HikariCP pool settings.
- `app.jwt.secret` / `app.jwt.expiration`: JWT configuration.
- `springdoc.*`: Swagger UI paths and settings.
- `server.port`: Default `8080`.

### Running Backend

```bash
cd backend
./mvnw spring-boot:run
```

Swagger UI: `http://localhost:8080/swagger-ui.html`

---

## Frontend Documentation

### Overview
The frontend is a React single-page application served via Vite (dev) or Nginx (production). It uses Material UI for components and React Router for navigation.

### Key Directories

- **`components`**: Layout, Sidebar, TopBar, PrivateRoute, RoleGate, StatCard, ConfirmDialog.
- **`constants`**: Shared enums (`ShipmentStatus`, `VehicleStatus`, `UserRole`).
- **`context`**: `AuthContext` providing global auth state and helper methods.
- **`pages`**: Page components for each route.
- **`services`**: Axios-based API modules per domain.

### Services

| Service | Base Path | Description |
|---------|-----------|-------------|
| `api.js` | `/api` | Axios instance with auth interceptor |
| `authService.js` | `/api/auth` | Login, register |
| `shipmentService.js` | `/api/shipments` | CRUD, status updates, tracking |
| `driverService.js` | `/api/drivers` | Driver management |
| `vehicleService.js` | `/api/vehicles` | Vehicle management |
| `userService.js` | `/api/users` | User management |
| `trackingService.js` | `/api/tracking` | Tracking events |
| `dashboardService.js` | `/api/dashboard` | Dashboard stats |
| `notificationService.js` | `/api/notifications` | Notifications |

### Routing & Access Control

- **Public**: `/login`, `/register`, `/track/:trackingNumber`, `/unauthorized`.
- **Private**: All other routes wrapped in `PrivateRoute` with role checks.
- **Default route**: Redirects to `/dashboard` for ADMIN/DISPATCHER, `/shipments` for others.

### Role-Based Pages

| Route | Allowed Roles |
|-------|---------------|
| `/dashboard` | ADMIN, DISPATCHER |
| `/shipments` | ADMIN, DISPATCHER, DRIVER, CUSTOMER |
| `/shipments/create` | ADMIN, DISPATCHER, CUSTOMER |
| `/shipments/:id/edit` | ADMIN, DISPATCHER |
| `/tracking` | ADMIN, DISPATCHER, DRIVER |
| `/drivers` | ADMIN, DISPATCHER |
| `/vehicles` | ADMIN, DISPATCHER |
| `/users` | ADMIN |
| `/notifications` | All authenticated |

### Running Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173` by default.

---

## API Documentation

Interactive API documentation is available via Swagger UI when the backend is running:

- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON**: `http://localhost:8080/api-docs`

### Main Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and receive JWT

#### Shipments
- `POST /api/shipments` - Create shipment
- `GET /api/shipments` - List shipments (paginated)
- `GET /api/shipments/{id}` - Get shipment by ID
- `GET /api/shipments/tracking/{trackingNumber}` - Track by number
- `GET /api/shipments/status/{status}` - Filter by status
- `GET /api/shipments/driver/{driverId}` - Filter by driver
- `PATCH /api/shipments/{id}/status` - Update status
- `DELETE /api/shipments/{id}` - Delete shipment

#### Drivers
- `POST /api/drivers/{userId}` - Create driver profile
- `GET /api/drivers/{id}` - Get driver by ID
- `GET /api/drivers` - List drivers (paginated)
- `GET /api/drivers/available` - List available drivers
- `PATCH /api/drivers/{id}/status` - Update driver status
- `DELETE /api/drivers/{id}` - Delete driver

#### Vehicles
- `POST /api/vehicles` - Create vehicle
- `GET /api/vehicles/{id}` - Get vehicle by ID
- `GET /api/vehicles` - List vehicles (paginated)
- `GET /api/vehicles/available` - List available vehicles
- `GET /api/vehicles/assignable` - List assignable vehicles
- `PUT /api/vehicles/{id}` - Update vehicle
- `POST /api/vehicles/{vehicleId}/assign/{driverId}` - Assign driver
- `DELETE /api/vehicles/{vehicleId}/unassign` - Unassign driver
- `DELETE /api/vehicles/{id}` - Delete vehicle

#### Users
- `GET /api/users` - List users (paginated)
- `GET /api/users/{id}` - Get user by ID
- `GET /api/users/role/{role}` - Filter by role
- `GET /api/users/lookup` - Get all users for dropdowns
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

#### Tracking
- `POST /api/tracking` - Add tracking event
- `GET /api/tracking/shipment/{shipmentId}` - Get tracking history
- `GET /api/tracking/shipment/{shipmentId}/page` - Get tracking history (paginated)

#### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

#### Notifications
- `POST /api/notifications/{userId}` - Create notification
- `GET /api/notifications/{userId}` - Get notifications (paginated)
- `GET /api/notifications/unread/{userId}` - Get unread notifications
- `GET /api/notifications/unread-count/{userId}` - Get unread count
- `PATCH /api/notifications/{notificationId}/read/{userId}` - Mark as read
- `PATCH /api/notifications/read-all/{userId}` - Mark all as read

---

## Environment Variables

### Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PROFILE` | `dev` | Spring profile |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `slp_db` | Database name |
| `DB_USERNAME` | `postgres` | Database username |
| `DB_PASSWORD` | `mysecretpassword` | Database password |
| `JWT_SECRET` | *(required in prod)* | JWT signing secret |
| `JWT_EXPIRATION` | `86400000` | JWT expiration ms |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins |
| `SERVER_PORT` | `8080` | Backend port |

### Frontend
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080` | Backend API base URL |

---

## Running Locally

### Prerequisites
- Java 17
- Node.js 18+
- PostgreSQL 15
- Maven

### Steps
1. Start PostgreSQL and create database `slp_db`.
2. Run backend: `cd backend && ./mvnw spring-boot:run`
3. Run frontend: `cd frontend && npm install && npm run dev`
4. Access app at `http://localhost:5173`

---

## Docker Deployment

```bash
docker-compose up --build
```

- Frontend: `http://localhost`
- Backend: `http://localhost:8080`
- PostgreSQL: `localhost:5432`

Configure environment variables in `.env` or shell before running.
