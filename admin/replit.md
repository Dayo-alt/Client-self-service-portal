Firebase Admin Dashboard
Overview
This is a full-stack admin dashboard application for managing Firebase users. The application provides administrators with comprehensive user management capabilities including viewing user statistics, searching and filtering users, and performing CRUD operations on user accounts. Built with a modern tech stack, it features a responsive React frontend with shadcn/ui components and an Express.js backend that integrates with Firebase Admin SDK for user management.

User Preferences
Preferred communication style: Simple, everyday language.

System Architecture
Frontend Architecture
Framework: React 18 with TypeScript using Vite as the build tool
UI Components: shadcn/ui component library built on Radix UI primitives
Styling: Tailwind CSS with CSS variables for theming and dark mode support
State Management: TanStack Query (React Query) for server state management and caching
Routing: Wouter for client-side routing with protected admin routes
Forms: React Hook Form with Zod validation resolvers
Backend Architecture
Runtime: Node.js with Express.js framework
Language: TypeScript with ES modules
Authentication: Firebase Admin SDK for user authentication and authorization
API Design: RESTful API with admin-only middleware protection
Development: Hot reload with Vite middleware integration
Database Architecture
Primary Database: Firebase Authentication for user management
ORM: Drizzle ORM configured for PostgreSQL (ready for future database needs)
Schema: Type-safe database schemas with Drizzle-Zod integration
Migrations: Drizzle Kit for database schema management
Authentication & Authorization
Client Authentication: Firebase Auth with admin claim verification
Server Authorization: Firebase Admin SDK token verification middleware
Role-Based Access: Admin-only routes with custom claims checking
Session Management: Firebase ID tokens for stateless authentication
Development & Build System
Build Tool: Vite with React plugin and TypeScript support
Package Manager: npm with package-lock.json for reproducible builds
Development Server: Express with Vite middleware for HMR
Production Build: Static assets served by Express with esbuild bundling
UI/UX Design Patterns
Design System: Consistent component library with variant-based styling
Responsive Design: Mobile-first approach with Tailwind breakpoints
Theme Support: Light/dark mode with CSS custom properties
Loading States: Skeleton components and loading indicators
Error Handling: Toast notifications for user feedback
External Dependencies
Firebase Services
Firebase Authentication: User management and authentication
Firebase Admin SDK: Server-side user operations and token verification
Required Environment Variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
Database Services
PostgreSQL: Configured via Drizzle for future database operations
Neon Database: Serverless PostgreSQL provider integration
Environment Variables: DATABASE_URL for database connection
Development Tools
Replit Integration: Development banner and cartographer plugin for Replit environment
Error Overlay: Runtime error modal for development debugging
TypeScript: Strict type checking with modern ES features
UI Dependencies
Radix UI: Accessible component primitives for complex UI elements
Lucide React: Icon library for consistent iconography
Tailwind CSS: Utility-first CSS framework
Class Variance Authority: Type-safe component variant management
Server Dependencies
Express.js: Web framework with middleware support
CORS: Cross-origin resource sharing configuration
Session Management: Connect-pg-simple for future session storage
Date Handling: date-fns for date formatting and manipulation