# Agent Instructions for Exam-Turk Codebase

## Build/Test/Lint Commands
- **Dev server**: `npm run dev` (runs on port 3001)
- **Build**: `npm run build` (TypeScript compilation + Vite build)
- **Lint**: `npm run lint` (ESLint with TypeScript support)
- **Preview**: `npm run preview` (preview production build)
- **Note**: No test framework detected - check with user for testing approach

## Architecture & Structure
- **Framework**: React 19 + TypeScript + Vite
- **Router**: React Router v7 (file-based routing)
- **Styling**: TailwindCSS v4 + Radix UI components
- **State**: React Query for server state, Context API for auth
- **API**: Axios with interceptors, cookie-based auth service
- **Main directories**: `/src/pages` (routes), `/src/services` (API), `/src/components` (UI), `/src/contexts` (state)

## Code Style & Conventions
- **Imports**: Use `@/` alias for src imports (e.g., `@/components/ui/button`)
- **Components**: PascalCase filenames, export default, use Radix UI components
- **Types**: TypeScript interfaces with PascalCase, explicit typing for service functions
- **File naming**: kebab-case for pages/components, camelCase for services
- **Styling**: Tailwind classes, responsive design with mobile-first approach
- **Error handling**: Toast notifications using Sonner, try-catch in services
- **Auth**: Cookie-based with secure storage helpers, context provider pattern
