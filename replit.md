# MinimalChat Application

## Overview

MinimalChat is a modern, real-time messaging application built with a full-stack TypeScript architecture. The application features a React frontend with Tailwind CSS and shadcn/ui components, an Express.js backend, and PostgreSQL database with Drizzle ORM. It includes authentication via Google OAuth, real-time messaging capabilities, whisper messages with auto-expiration, typing indicators, and customizable user profiles. The application is now configured for deployment on Railway.app with Supabase as the database provider.

## User Preferences

Preferred communication style: Simple, everyday language.
Deployment preference: Railway.app with Supabase database and Google OAuth authentication.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite for development and production builds
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Authentication**: Passport.js with OpenID Connect (Replit OIDC)
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with JSON responses
- **Error Handling**: Centralized error middleware

### Database Architecture
- **Database**: PostgreSQL with Supabase (node-postgres driver)
- **ORM**: Drizzle ORM with TypeScript-first schema definitions
- **Migration Strategy**: Schema-first with drizzle-kit for migrations
- **Connection Management**: Direct PostgreSQL client connection

## Key Components

### Authentication System
- **Provider**: Google OAuth 2.0 integration for secure authentication
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Middleware**: Route-level authentication guards with Passport.js
- **User Management**: Automatic user creation/updates on login

### Real-time Messaging
- **Message Types**: Text messages and voice message placeholders
- **Whisper Messages**: Auto-expiring messages with special styling
- **Typing Indicators**: Real-time typing status with cleanup mechanisms
- **Message Status**: Read receipts and delivery confirmation

### User Experience Features
- **Theme Support**: Light/dark mode with system preference detection
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Color Customization**: User-selectable color tags for personalization
- **Online Status**: Real-time user presence indicators

### Data Models
- **Users**: Profile information, online status, preferences
- **Messages**: Content, type, whisper status, timestamps
- **Chats**: One-to-one conversations between users
- **Sessions**: Authentication session persistence
- **Typing Indicators**: Temporary typing status tracking

## Data Flow

### Authentication Flow
1. User visits landing page
2. Clicks sign-in, redirected to Google OAuth
3. User authenticates with Google account
4. Google returns user profile information
5. Backend creates/updates user in database
6. User session created and stored in PostgreSQL
7. User redirected to main application

### Messaging Flow
1. User types message in input component
2. Typing indicator sent to other participants
3. Message submitted via API to backend
4. Message validated and stored in database
5. Real-time polling updates chat interface
6. Message bubbles rendered with appropriate styling

### Profile Management
1. User accesses profile page
2. Form pre-populated with current user data
3. Changes submitted to update API endpoint
4. Database updated with new profile information
5. UI reflects changes immediately

## External Dependencies

### Core Dependencies
- **React Ecosystem**: React, React DOM, React Query
- **UI Framework**: Radix UI primitives, Tailwind CSS
- **Backend**: Express.js, Passport.js, Drizzle ORM
- **Database**: PostgreSQL via Neon serverless driver
- **Validation**: Zod for runtime type checking
- **Date Handling**: date-fns for formatting and manipulation

### Development Tools
- **Build System**: Vite with TypeScript support
- **Code Quality**: TypeScript strict mode, ESLint configuration
- **Development Experience**: Hot module replacement, error overlays
- **Replit Integration**: Cartographer plugin, runtime error modals

### Authentication Dependencies
- **Google OAuth**: passport-google-oauth20 for OAuth integration
- **Session Management**: express-session, connect-pg-simple, passport.js
- **Security**: Secure session cookies, CSRF protection

## Deployment Strategy

### Build Process
1. Frontend built with Vite to static assets
2. Backend bundled with esbuild for Node.js
3. Database schema applied via drizzle-kit
4. Environment variables configured for production

### Environment Configuration
- **Database**: DATABASE_URL for Supabase PostgreSQL connection
- **Authentication**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET for OAuth
- **Sessions**: SESSION_SECRET for secure session encryption
- **Runtime**: NODE_ENV for environment-specific behavior
- **Deployment**: PORT for Railway.app hosting

### Production Considerations
- Static file serving handled by Express in production
- Database migrations managed through drizzle-kit commands
- Session cleanup and whisper message expiration via scheduled tasks
- Error logging and monitoring through application middleware

### Development vs Production
- Development uses Vite dev server with HMR
- Production serves pre-built static files
- Development includes Replit-specific tooling and debugging
- Production optimizes for performance and security