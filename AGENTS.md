# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm install        # Install dependencies (pnpm required)
pnpm dev            # Start dev server at http://localhost:3000
pnpm build          # Production build (includes type checking)
pnpm lint           # Run ESLint
```

## Architecture Overview

This is a Next.js 16 App Router dashboard for managing GitHub Enterprise organization resources: teams, members, cost centers, and budgets. Uses GitHub OAuth for authentication with encrypted cookie sessions (iron-session).

### Tech Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- shadcn/ui (New York style) with Radix UI primitives
- Tailwind CSS v4, @dnd-kit for drag-and-drop
- Octokit.js v5 for GitHub REST API

### Key Patterns

**Octokit Usage** - Always use helpers from `lib/octokit.ts`:
- `getAuthenticatedOctokit()` - Creates session-authenticated Octokit instance
- `getOrgName()` / `getEnterpriseName()` - Get env vars (throws if missing)
- Use `octokit.paginate()` for all list endpoints (GitHub paginates at 100 items)

**API Routes** - Follow this pattern in `app/api/*/route.ts`:
```typescript
export async function GET() {
  const octokit = await getAuthenticatedOctokit();
  const org = getOrgName();
  const data = await octokit.paginate(octokit.rest.teams.list, { org, per_page: 100 });
  return NextResponse.json<ApiResponse<T>>({ data });
}
```
- All responses use `ApiResponse<T>` shape: `{ data: T, error?: string }`
- Transformer functions normalize API responses (see `app/api/*/transformers.ts`)

**Client Components** - All interactive pages use `'use client'` directive:
- Fetch via client-side `fetch()` to `/api/*` routes
- Use `useState` + `useEffect` for data loading

**Types** - Import from `@/lib/types/github.ts`, do not duplicate definitions

**shadcn/ui** - Do not manually edit `components/ui/*`. Add components with:
```bash
pnpm dlx shadcn@latest add <component-name>
```

## Environment Variables

Required in `.env.local`:
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - OAuth App credentials
- `SESSION_SECRET` - 32+ character random string for session encryption
- `GITHUB_ORG` - Organization login (handle)
- `GITHUB_ENTERPRISE` - Enterprise slug (for billing/cost center APIs)
- `APP_URL` - Base URL for OAuth redirects

## Project Structure

```
app/
├── api/                    # API routes proxying to GitHub
│   ├── auth/github/        # OAuth login/callback/logout/me
│   ├── teams/              # Team CRUD + members
│   ├── members/            # Org members
│   ├── cost-centers/       # Enterprise cost center management
│   ├── budgets/            # Enterprise budget management
│   └── billing-usage/      # Usage data
├── teams/, members/, budgets/, cost-centers/  # Page routes
lib/
├── octokit.ts              # Octokit helpers (read this first)
├── auth/session.ts         # iron-session config
├── types/github.ts         # Shared TypeScript types
components/
├── ui/                     # shadcn/ui primitives (DO NOT edit)
├── teams/, members/, budgets/, cost-centers/  # Feature components
docs/
├── OCTOKIT_GUIDE.md        # Comprehensive Octokit SDK reference
├── OAUTH_SETUP.md          # OAuth app setup instructions
```

## Conventions

- Use `@/*` import aliases (configured in tsconfig.json)
- Use `cn()` from `@/lib/utils` for conditional classNames
- React components: PascalCase filenames; API routes: lowercase `route.ts`
- Icons from `lucide-react`
