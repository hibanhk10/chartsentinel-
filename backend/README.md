# Chartsentinel Backend

A production-ready Node.js/TypeScript backend API for Chartsentinel.

## Installation

```bash
cd backend
npm install
```

## Environment Setup

Copy the environment example file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5432/chartsentinel?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
```

## Database Setup

Generate Prisma client:

```bash
npm run prisma:generate
```

Run migrations (after setting up your PostgreSQL database):

```bash
npm run prisma:migrate
```

## Running Locally

Development mode with hot reload:

```bash
npm run dev
```

Production build and start:

```bash
npm run build
npm start
```

## API Endpoints

Base URL: `http://localhost:3000/api`

### Health
- `GET /api/health` - Health check

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Reports
- `GET /api/reports` - Get all reports
- `GET /api/reports/:id` - Get specific report

### News
- `GET /api/news` - Get all news
- `GET /api/news/:id` - Get specific news article

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## Technology Stack

- **Node.js** - Runtime environment
- **TypeScript** - Type-safe JavaScript
- **Express** - Web framework
- **Prisma** - ORM for database operations
- **PostgreSQL** - Database
- **Zod** - Schema validation
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

## Project Structure

```
src/
├── app.ts              # Express app configuration
├── server.ts           # Server startup
├── config/
│   ├── env.ts          # Environment variables
│   └── db.ts           # Database connection
├── controllers/        # Request handlers
├── services/           # Business logic
├── middlewares/        # Express middlewares
├── routes/             # API routes
└── utils/              # Utility functions
```
