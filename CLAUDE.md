# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
```bash
pnpm dev              # Start development server
pnpm build            # Production build  
pnpm type-check       # TypeScript validation
pnpm lint             # ESLint validation
```

**Database & Types:**
```bash
pnpm run generate-types    # Update Supabase types from schema
pnpm run generate-tags     # Bulk create tags from JSON (local script)
```

## Architecture Overview

This is a **Next.js 14 + TypeScript** application using the **App Router** with a modern tech stack focused on type safety and developer experience.

### Core Technologies
- **ORPC v1.8.6**: Type-safe RPC layer for API communication
- **TanStack Query**: Server state management and caching
- **Supabase**: Backend database with auto-generated TypeScript types
- **Kysely**: Type-safe SQL query builder for optimized database queries
- **nuqs**: URL state management for filters
- **Tailwind CSS**: Styling with shadcn/ui components

### Data Flow Architecture

**Frontend → Backend Flow:**
1. UI components use **nuqs** for URL-based filter state
2. **TanStack Query** hooks call ORPC endpoints directly via `orpc.images.getAll.queryOptions()`
3. **ORPC client** (`/utils/orpc/index.ts`) makes type-safe calls to `/app/api/rpc/[[...rest]]/route.ts`
4. **ORPC router** (`/utils/orpc/router/`) handles requests with Kysely queries
5. **Kysely client** (`/utils/kysely/client.ts`) executes optimized SQL queries

### Database Schema
- `images` table: Core image records
- `tags` table: Hierarchical tags with optional `master_tag_id`
- `images-tags` junction table: Many-to-many relationships

### Key Patterns

**Type Safety Chain:**
- Database schema → `/types/supabase.ts` (auto-generated)
- ORPC routes → Type-safe client calls
- TanStack Query → Cached, typed API responses

**State Management Layers:**
1. **URL State** (nuqs): Filter parameters, shareable state
2. **Server State** (TanStack Query): API data with caching
3. **Local State** (React): Component-specific UI state

**Component Organization:**
- `/components/ui/`: Reusable base components (shadcn/ui style)
- `/components/images/`: Feature-specific business logic components
- `/app/`: Next.js App Router pages and layouts

### ORPC Integration
- **Router Definition**: `/utils/orpc/router/index.ts`
- **Client Setup**: `/utils/orpc/index.ts` for browser calls
- **Server Setup**: `/utils/orpc/orpc.server.ts` for API handlers
- **Middlewares**: `/utils/orpc/middlewares.ts` (includes `pub` middleware)

### Supabase Configuration
- **Client**: `/utils/supabase/client.ts` (browser operations)
- **Server**: `/utils/supabase/server.ts` (SSR with cookies)
- **Admin**: `/utils/supabase/admin.ts` (privileged operations)

### Important Notes

**Type Generation:** Always run `pnpm run generate-types` after Supabase schema changes to update `/types/supabase.ts`.

**Path Aliases:** ALWAYS use `@/` for imports instead of relative paths like `../../`. This is configured in `tsconfig.json`.

**Authentication:** Currently public read-only access with RLS policies. No auth implementation yet.

**Image Filtering:** Tag filters use comma-separated IDs in URL (`?tags=1,3,5`) via nuqs integration.

**Local Scripts:** Use `/utils/local-script/` for data management tasks. The `generate-tags.ts` script creates hierarchical tags from JSON data.