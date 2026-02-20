# Supabase-Style Postgres User Management Backend

A production-ready Node.js + TypeScript backend that implements a Supabase-style user management system using PostgreSQL and Prisma ORM. This self-hosted solution provides core authentication features similar to Supabase Auth, including email/password authentication, JWT tokens, refresh tokens, password reset, email verification, and role-based access control.

## Features

- 🔐 **Email/Password Authentication**: Secure user registration and login
- 🔄 **JWT Tokens**: Short-lived access tokens (15 min) and long-lived refresh tokens (7 days)
- 🔑 **Password Reset**: Secure password reset flow with email tokens
- ✉️ **Email Verification**: Optional email verification with magic link-style tokens
- 👤 **Profile Management**: Update user metadata (name, avatar, etc.)
- 🛡️ **Role-Based Access Control (RBAC)**: User and admin roles with permission middleware
- 🔒 **Security Features**:
  - Bcrypt password hashing
  - Helmet security headers
  - Rate limiting for API protection
  - CORS configuration
  - Input validation with Zod
- 📊 **PostgreSQL + Prisma**: Type-safe database access with migrations
- 🧪 **Testing**: Jest test suite included
- 📝 **Structured Logging**: Pino logger with pretty printing in development
- 🛡️ **Error Handling**: Global error handling middleware with consistent responses

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: Zod
- **Logging**: Pino
- **Testing**: Jest + Supertest

## Prerequisites

- Node.js v18 or higher
- PostgreSQL 12 or higher (local or cloud instance)
- npm or yarn

## Setup Instructions

### 1. Clone and Install

```bash
cd Postgres-User-Management-Backend
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and fill in your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database (PostgreSQL connection string)
DATABASE_URL=postgresql://user:password@localhost:5432/user_management?schema=public

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
REFRESH_SECRET=your-refresh-token-secret-different-from-jwt-secret

# Email Configuration (for password reset and verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourapp.com

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# Logging
LOG_LEVEL=info
```

**Important**: 
- Generate strong secrets for `JWT_SECRET` and `REFRESH_SECRET` (minimum 32 characters)
- Use different secrets for `JWT_SECRET` and `REFRESH_SECRET`
- Update `DATABASE_URL` with your PostgreSQL credentials

### 3. Database Setup

#### Option A: Local PostgreSQL

1. Create a database:
```sql
CREATE DATABASE user_management;
```

2. Update `DATABASE_URL` in `.env`:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/user_management?schema=public
```

#### Option B: PostgreSQL Cloud (Supabase, Railway, etc.)

Use the connection string provided by your cloud provider.

### 4. Prisma Setup

Generate Prisma Client:

```bash
npm run generate
```

Run migrations to create database tables:

```bash
npm run migrate
```

This will:
- Create all tables (users, identities, refresh_tokens, password_reset_tokens, email_verification_tokens)
- Set up indexes and constraints
- Create the database schema

### 5. Start Development Server

```bash
npm run dev
```

The server will start on the port specified in your `.env` file (default: 3000).

### 6. (Optional) Open Prisma Studio

View and manage your database:

```bash
npm run studio
```

## Project Structure

```
Postgres-User-Management-Backend-1/
├── prisma/
│   └── schema.prisma          # Prisma schema with all models
├── src/
│   ├── config/
│   │   └── database.ts        # Prisma client and connection
│   ├── controllers/
│   │   └── authController.ts   # Authentication request handlers
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication middleware
│   │   ├── rbac.ts            # Role-based access control
│   │   ├── errorHandler.ts    # Global error handling
│   │   ├── rateLimiter.ts     # Rate limiting middleware
│   │   └── validation.ts      # Request validation middleware
│   ├── routes/
│   │   ├── authRoutes.ts      # Authentication routes
│   │   └── index.ts           # Route aggregator
│   ├── services/
│   │   └── authService.ts     # Authentication business logic
│   ├── types/
│   │   └── index.ts           # TypeScript types and interfaces
│   ├── utils/
│   │   ├── jwt.ts             # JWT token utilities
│   │   ├── password.ts        # Password hashing utilities
│   │   ├── tokens.ts          # Token generation utilities
│   │   ├── email.ts           # Email service (simulated)
│   │   └── logger.ts          # Pino logger configuration
│   └── server.ts              # Application entry point
├── tests/
│   └── auth.test.ts           # Jest test suite
├── .env.example               # Environment variables template
├── package.json               # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── jest.config.js            # Jest configuration
└── README.md                  # This file
```

## API Endpoints

### Authentication Endpoints

#### Sign Up

Register a new user.

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "metadata": {
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": "https://example.com/avatar.jpg"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user",
      "confirmedAt": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "userMetadata": {
        "first_name": "John",
        "last_name": "Doe"
      },
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Auth Required**: No

---

#### Sign In

Login with email and password.

```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Auth Required**: No

---

#### Refresh Token

Exchange refresh token for new access token.

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Auth Required**: No

---

#### Logout

Invalidate refresh token(s).

```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "optional-specific-token-to-revoke"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": {}
}
```

**Auth Required**: Yes

---

#### Get Current User

Get authenticated user profile.

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user",
      ...
    }
  }
}
```

**Auth Required**: Yes

---

#### Update Profile

Update user metadata (name, avatar, etc.).

```http
PATCH /api/auth/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "metadata": {
    "first_name": "Jane",
    "last_name": "Smith",
    "avatar_url": "https://example.com/new-avatar.jpg"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": { ... }
  }
}
```

**Auth Required**: Yes

---

#### Forgot Password

Request password reset email.

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent.",
  "data": {}
}
```

**Note**: For security, the response is the same whether the user exists or not.

**Auth Required**: No

---

#### Reset Password

Reset password using token from email.

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {}
}
```

**Auth Required**: No

---

#### Verify Email

Verify email address using token from email.

```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {}
}
```

**Auth Required**: No

---

### Protected Routes

#### Protected Route Example

```http
GET /api/protected
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "message": "This is a protected route",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Auth Required**: Yes

---

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Auth Required**: No

---

## Support

- Telegram: https://t.me/topBtek
- Twitter: https://x.com/topBtek
