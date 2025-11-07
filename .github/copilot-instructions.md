# GitHub Organization Manager - AI Coding Agent Instructions

## Project Overview

This is a Next.js 16 dashboard application for managing GitHub organization teams and members with drag-and-drop functionality. It uses the Octokit SDK to interact with GitHub's REST API and provides visual team management through a modern shadcn/ui interface.

## Architecture

### Technology Stack
- **Framework**: Next.js 16 (App Router) with React 19 and TypeScript
- **UI Components**: shadcn/ui (New York style) with Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **GitHub Integration**: Octokit.js v5 SDK for REST API access
- **Drag & Drop**: @dnd-kit/core for member management UX
- **Package Manager**: pnpm (required - see `pnpm-workspace.yaml`)

### Core Structure
```
app/                        # Next.js App Router pages and API routes
├── api/                    # Server-side API routes (proxy to GitHub API)
│   ├── members/route.ts    # Fetch org members with team affiliations
│   ├── teams/route.ts      # List/create teams
│   └── teams/[teamSlug]/   # Team-specific operations (update, delete, members)
├── teams/                  # Team management pages
└── members/                # Member listing page

lib/
├── octokit.ts             # Singleton Octokit client (CRITICAL: read this first)
├── types/github.ts        # Centralized GitHub API types
└── utils.ts               # Tailwind utility (cn function)

components/
├── ui/                    # shadcn/ui primitives (DO NOT edit manually)
├── teams/                 # Team-specific components
├── members/               # Member cards and draggable wrappers
└── layout/                # Header, theme toggle
```

## Critical Configuration

### Environment Variables (Required)
Create `.env.local` in project root:
```env
GITHUB_TOKEN=ghp_...           # Classic PAT with admin:org scope
GITHUB_ORG=your-org-name       # Organization login (not display name)
NEXT_PUBLIC_APP_NAME=...       # Optional: Custom app name in header
```

**The app fails fast if these are missing** - see `lib/octokit.ts` for error handling.

### Octokit Singleton Pattern
- **ALWAYS** import from `@/lib/octokit` - never instantiate new Octokit instances
- Use `octokit.paginate()` for lists - GitHub API paginates at 100 items/page
- Call `getOrgName()` helper instead of reading `process.env.GITHUB_ORG` directly
- See `docs/OCTOKIT_GUIDE.md` for comprehensive SDK reference

### Type Safety
- All GitHub API responses map through transformer functions (e.g., `mapTeam` in `app/api/teams/transformers.ts`)
- Transformers normalize nullish values and ensure type consistency
- Import types from `@/lib/types/github.ts` - do NOT duplicate interface definitions

## Development Patterns

### API Routes (App Router)
```typescript
// Standard pattern for all routes:
export async function GET(request: NextRequest) {
  try {
    const org = getOrgName();  // Always call this first
    
    // Use octokit.paginate for lists
    const items = await octokit.paginate(octokit.rest.teams.list, {
      org,
      per_page: 100,
    });
    
    return NextResponse.json<ApiResponse<T>>({ data: items }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json<ApiResponse<T>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}
```

- **All responses** follow `ApiResponse<T>` shape: `{ data: T, error?: string }`
- Use HTTP status codes appropriately (200, 201, 204, 400, 500)
- Validate query params against Sets for type safety (see `ROLE_FILTERS` pattern)

### Client Components (React 19)
- **All pages and interactive components** are `'use client'` - Next.js 16 App Router defaults to Server Components
- Drag-and-drop requires `'use client'` - see `TeamMemberManager.tsx` and `DraggableMember.tsx`
- Use optimistic updates: update local state immediately, revert on error (see `addMemberToTeam` in `TeamMemberManager.tsx`)

### shadcn/ui Component Usage
- **DO NOT** manually edit files in `components/ui/` - regenerate with `pnpm dlx shadcn@latest add <component>`
- Use `cn()` utility from `@/lib/utils` for conditional className merging
- Components use CSS variables from `app/globals.css` (e.g., `--primary`, `--destructive`)
- Icon library: `lucide-react` (already imported in existing components)

### Drag-and-Drop Pattern
```tsx
// Standard @dnd-kit pattern used in TeamMemberManager:
<DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
  <DroppableZone id="team">
    {items.map(item => <DraggableMember key={item.id} member={item} source="team" />)}
  </DroppableZone>
  <DragOverlay>{activeDragMember && <MemberCard member={activeDragMember} />}</DragOverlay>
</DndContext>
```

- `useDraggable` items need unique IDs like `${source}-${member.login}`
- Use `PointerSensor` with `activationConstraint.distance` for click vs. drag distinction
- `DragOverlay` renders the dragging preview without affecting layout

## Workflow Commands

```bash
# Development
pnpm install              # Install dependencies (respects pnpm-workspace.yaml)
pnpm dev                  # Start dev server on http://localhost:3000

# Production
pnpm build                # Build for production (checks types, lints)
pnpm start                # Run production server

# Linting
pnpm lint                 # Run ESLint (eslint.config.mjs)
```

## Common Tasks

### Adding a New API Route
1. Create `app/api/[resource]/route.ts`
2. Import `{ octokit, getOrgName }` from `@/lib/octokit`
3. Use `octokit.paginate()` for lists, handle errors with try/catch
4. Return `NextResponse.json<ApiResponse<T>>(...)` with proper status codes
5. Add types to `lib/types/github.ts` if needed

### Adding a New Page
1. Create `app/[route]/page.tsx` with `'use client'` directive
2. Fetch data via client-side `fetch()` to `/api/*` routes
3. Use `useState` + `useEffect` for data loading pattern (see `TeamDetailsPage`)
4. Import UI components from `@/components/ui/*` and compose layouts with Card/CardHeader/CardContent

### Adding shadcn/ui Components
```bash
pnpm dlx shadcn@latest add <component-name>  # e.g., dialog, toast, tabs
```
Components auto-install to `components/ui/` with proper TypeScript types.

### Extending GitHub API Integration
1. Consult `docs/OCTOKIT_GUIDE.md` for endpoint reference
2. Use `octokit.rest.*` methods (fully typed with TypeScript)
3. Add transformer function if response shape needs normalization
4. Update `GitHubMember` or `GitHubTeam` types in `lib/types/github.ts`

## Known Conventions

- **Never** call `process.env.GITHUB_ORG` directly - use `getOrgName()`
- **Always** paginate GitHub API calls with `octokit.paginate()`
- **File naming**: React components use PascalCase (e.g., `TeamCard.tsx`), API routes use lowercase (e.g., `route.ts`)
- **Import aliases**: Use `@/*` for all imports (configured in `tsconfig.json` paths)
- **Styling**: Prefer `className` with Tailwind utilities + `cn()` for conditionals
- **Forms**: Use controlled components with `useState` (see `CreateTeamForm.tsx`)

## Troubleshooting

- **"Missing GITHUB_TOKEN"**: Add to `.env.local` - requires classic PAT with `admin:org` scope
- **Rate limiting**: Octokit auto-retries; check GitHub API rate limit headers if persistent
- **TypeScript errors in `node_modules`**: Expected with Tailwind CSS v4 alpha - `skipLibCheck: true` in tsconfig
- **Image loading errors**: GitHub avatars are allowlisted in `next.config.ts` - add new domains there if needed
