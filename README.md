# Astral Core v7

A complete rewrite of the Astral Core mental health platform with improved architecture, security, and features.

## Features

- 🔐 **HIPAA-Compliant Security**: End-to-end encryption for all PHI data
- 🛡️ **Advanced Authentication**: NextAuth.js with OAuth and MFA support
- 📊 **Wellness Tracking**: Comprehensive mood, sleep, and mental health monitoring
- 🆘 **Crisis Support**: 24/7 crisis intervention system
- 💬 **Therapy Management**: Session notes, treatment plans, and progress tracking
- 📱 **Modern UI**: Built with Next.js 15, TypeScript, and Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Security**: AES-256-GCM encryption, rate limiting, session management

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Environment variables configured (see `.env.example`)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Authentication secret
- `ENCRYPTION_KEY`: PHI encryption key (generate with `openssl rand -hex 32`)

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   ├── ui/             # Base UI components
│   ├── layouts/        # Layout components
│   └── features/       # Feature-specific components
├── lib/                # Core utilities
│   ├── auth/          # Authentication config
│   ├── db/            # Database client
│   ├── security/      # Security utilities
│   ├── services/      # Business logic
│   ├── types/         # TypeScript types
│   └── constants/     # App constants
├── hooks/             # Custom React hooks
├── store/             # Zustand stores
└── middleware.ts      # Next.js middleware
```

## Security Features

- **PHI Encryption**: All Protected Health Information is encrypted at rest
- **Audit Logging**: Comprehensive audit trail for HIPAA compliance
- **Rate Limiting**: Protection against brute force and DDoS attacks
- **Session Management**: Secure session handling with timeout
- **Input Validation**: Strict validation and sanitization of all inputs
- **RBAC**: Role-based access control for different user types

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm run db:studio    # Open Prisma Studio
npm run db:migrate   # Run database migrations
```

## User Roles

- **CLIENT**: Regular users seeking mental health services
- **THERAPIST**: Licensed mental health professionals
- **ADMIN**: System administrators
- **CRISIS_RESPONDER**: Specialized crisis intervention staff
- **SUPERVISOR**: Clinical supervisors

## API Structure

All API routes follow RESTful conventions:

- `/api/auth/*` - Authentication endpoints
- `/api/user/*` - User profile and settings
- `/api/wellness/*` - Wellness tracking
- `/api/appointments/*` - Appointment management
- `/api/crisis/*` - Crisis intervention
- `/api/therapist/*` - Therapist-specific endpoints
- `/api/admin/*` - Administrative endpoints

## Contributing

This is a private project. All contributions must follow HIPAA compliance guidelines.

## License

Proprietary - All rights reserved

## Version

v7.0.0 - Complete rewrite with enhanced security and features