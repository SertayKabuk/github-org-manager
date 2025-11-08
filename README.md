# GitHub Organization Manager

A modern Next.js dashboard for managing GitHub organization teams and members with an intuitive drag-and-drop interface. Built with Next.js 16, React 19, TypeScript, and shadcn/ui.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![React](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🎯 **Visual Team Management**: Drag-and-drop interface for managing team members
- 👥 **Member Overview**: View all organization members with their team affiliations
- 🏢 **Team Operations**: Create, update, and delete teams with ease
- 🎨 **Modern UI**: Built with shadcn/ui and Tailwind CSS v4
- 🌓 **Dark Mode**: System-aware theme switching with next-themes
- 🔒 **Type-Safe**: Full TypeScript support with GitHub API types
- ⚡ **Optimized**: React 19 with Next.js 16 App Router for optimal performance

## Prerequisites

- **Node.js**: 20.x or later
- **pnpm**: 9.x or later (required - this project uses pnpm workspaces)
- **GitHub OAuth App**: OAuth application registered with GitHub
- **GitHub Organization**: Admin access to a GitHub organization

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SertayKabuk/github-org-manager.git
   cd github-org-manager
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the project root:
   ```env
   # GitHub OAuth App Credentials
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   
   # Session Secret (32+ character random string)
   SESSION_SECRET=your_long_random_secret_here_at_least_32_characters
   
   # Organization to manage
   GITHUB_ORG=your-organization-name
   
   # Optional: Custom app name
   NEXT_PUBLIC_APP_NAME=GitHub Org Manager
   
   # Base URL (runtime-configurable, defaults to localhost:3000)
   APP_URL=http://localhost:3000
   ```

   **OAuth Setup**:
   See the detailed [OAuth Setup Guide](docs/OAUTH_SETUP.md) for complete instructions on:
   - Creating a GitHub OAuth App
   - Generating a session secret
   - Configuring production deployments

4. **Start the development server**
   ```bash
   pnpm dev
   ```

5. **Open the application**
   
   Navigate to [http://localhost:3000](http://localhost:3000) and click "Login with GitHub" to authenticate.

## Authentication

This application uses **GitHub OAuth** for secure authentication. Users must login with their GitHub account to access organization management features.

**Key Features**:
- Secure session-based authentication with encrypted cookies
- No static tokens required
- Per-user authentication with proper GitHub permissions
- Automatic session management and token refresh

After logging in, users can manage teams and members based on their GitHub organization permissions.

## Usage

### Managing Teams

- **View Teams**: Navigate to `/teams` to see all organization teams
- **Create Team**: Click "Create New Team" and fill in the team details
- **View Team Details**: Click on any team card to see members and manage settings
- **Delete Team**: Use the delete button in the team details page

### Managing Members

- **View Members**: Navigate to `/members` to see all organization members
- **Add to Team**: Drag a member from the "Available Members" section and drop them onto a team
- **Remove from Team**: Drag a member from a team and drop them back to "Available Members"
- **Filter Members**: Use the role filter to view members by their organization role

## Project Structure

```
github-org-manager/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes (proxy to GitHub API)
│   │   ├── members/           # Member endpoints
│   │   ├── teams/             # Team endpoints
│   │   └── orgs/              # Organization endpoints
│   ├── teams/                 # Team management pages
│   ├── members/               # Member listing page
│   └── layout.tsx             # Root layout with theme provider
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   ├── teams/                 # Team-specific components
│   ├── members/               # Member cards and draggables
│   └── layout/                # Header, sidebar
├── lib/
│   ├── octokit.ts            # Octokit singleton client
│   ├── types/                 # TypeScript type definitions
│   └── utils.ts               # Utility functions
├── docs/
│   └── OCTOKIT_GUIDE.md      # Octokit SDK reference
└── public/                    # Static assets
```

## Technology Stack

### Core
- **[Next.js 16](https://nextjs.org/)**: React framework with App Router
- **[React 19](https://react.dev/)**: UI library with latest features
- **[TypeScript 5](https://www.typescriptlang.org/)**: Type-safe development

### UI & Styling
- **[shadcn/ui](https://ui.shadcn.com/)**: Reusable component library (New York style)
- **[Radix UI](https://www.radix-ui.com/)**: Unstyled, accessible UI primitives
- **[Tailwind CSS v4](https://tailwindcss.com/)**: Utility-first CSS framework
- **[Lucide Icons](https://lucide.dev/)**: Beautiful, consistent icon set
- **[next-themes](https://github.com/pacocoursey/next-themes)**: Theme management

### GitHub Integration
- **[Octokit.js v5](https://github.com/octokit/octokit.js)**: Official GitHub REST API client

### Drag & Drop
- **[@dnd-kit](https://dndkit.com/)**: Modern drag-and-drop toolkit for React

## API Routes

All API routes follow a consistent pattern with typed responses:

- `GET /api/teams` - List all teams
- `POST /api/teams` - Create a new team
- `GET /api/teams/[teamSlug]` - Get team details
- `PATCH /api/teams/[teamSlug]` - Update team
- `DELETE /api/teams/[teamSlug]` - Delete team
- `GET /api/teams/[teamSlug]/members` - List team members
- `PUT /api/teams/[teamSlug]/members` - Add/remove team members
- `GET /api/members` - List all organization members
- `GET /api/orgs` - Get organization information

## Development

### Commands

```bash
pnpm dev          # Start development server (localhost:3000)
pnpm build        # Build for production
pnpm start        # Run production server
pnpm lint         # Run ESLint
```

### Adding shadcn/ui Components

```bash
pnpm dlx shadcn@latest add <component-name>
```

Components are automatically installed to `components/ui/` with proper TypeScript types.

### Code Conventions

- **React Components**: PascalCase (e.g., `TeamCard.tsx`)
- **API Routes**: lowercase (e.g., `route.ts`)
- **Imports**: Use `@/*` alias for all internal imports
- **Styling**: Tailwind utilities with `cn()` helper for conditional classes
- **Client Components**: Mark with `'use client'` directive when using hooks or interactivity

## Configuration Files

- **`next.config.ts`**: Next.js configuration with image domain allowlist
- **`tsconfig.json`**: TypeScript configuration with path aliases
- **`tailwind.config.ts`**: Tailwind CSS v4 configuration
- **`components.json`**: shadcn/ui configuration
- **`eslint.config.mjs`**: ESLint configuration
- **`pnpm-workspace.yaml`**: pnpm workspace configuration

## Troubleshooting

### Authentication Issues
If you can't login or see "Not authenticated" errors, verify:
- GitHub OAuth App is properly configured
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
- Callback URL matches: `http://localhost:3000/api/auth/github/callback`
- Cookies are enabled in your browser

See the [OAuth Setup Guide](docs/OAUTH_SETUP.md) for detailed troubleshooting.

### Missing SESSION_SECRET Error
Generate a secure 32+ character random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Add the output to `.env.local` as `SESSION_SECRET`.

### Rate Limiting
The GitHub API has rate limits. Octokit automatically retries on rate limit errors. Check the [GitHub API rate limits](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting).

### TypeScript Errors in node_modules
This is expected with Tailwind CSS v4 alpha. The `tsconfig.json` has `skipLibCheck: true` to handle this.

### Image Loading Issues
GitHub avatar images are allowlisted in `next.config.ts`. Add new domains there if needed.

## Docker Support

A `Dockerfile` and `docker-compose.yml` are included for containerized deployment:

```bash
docker-compose up --build
```

## Deployment

### Environment Variables for Production

When deploying to production, you **MUST** set the following environment variables:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GITHUB_CLIENT_ID` | ✅ Yes | OAuth app client ID | `Iv1.abc123...` |
| `GITHUB_CLIENT_SECRET` | ✅ Yes | OAuth app client secret | `abc123...` |
| `SESSION_SECRET` | ✅ Yes | 32+ character random string | `abc123...` |
| `GITHUB_ORG` | ✅ Yes | Organization login name | `your-org` |
| `APP_URL` | ✅ **CRITICAL** | Your deployed application URL | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | ❌ No | Custom app name | `GitHub Org Manager` |

**⚠️ CRITICAL**: If `APP_URL` is not set, OAuth redirects will fail and users will be redirected to `localhost:3000` instead of your production URL.

### Platform-Specific Instructions

#### Vercel

1. **Configure environment variables**:
   ```bash
   vercel env add GITHUB_CLIENT_ID
   vercel env add GITHUB_CLIENT_SECRET
   vercel env add SESSION_SECRET
   vercel env add GITHUB_ORG
   vercel env add APP_URL
   # Enter: https://your-app.vercel.app
   ```

2. **Update GitHub OAuth App**:
   - Homepage URL: `https://your-app.vercel.app`
   - Callback URL: `https://your-app.vercel.app/api/auth/github/callback`

3. **Deploy**:
   ```bash
   vercel --prod
   ```

#### Railway

1. **Set environment variables** in the Railway dashboard or via CLI:
   ```bash
   railway variables set APP_URL=https://your-app.railway.app
   railway variables set GITHUB_CLIENT_ID=your_client_id
   # ... set other variables
   ```

2. **Update GitHub OAuth App** with Railway URLs

3. **Deploy** via Railway dashboard or CLI

#### Docker / Self-Hosted

1. **Create a `.env` file**:
   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   SESSION_SECRET=your_session_secret
   GITHUB_ORG=your-org
   APP_URL=https://your-domain.com
   ```

2. **Update GitHub OAuth App** with your domain URLs

3. **Deploy with Docker**:
   ```bash
   docker-compose up -d
   ```

### Post-Deployment Checklist

- ✅ All environment variables are set (especially `APP_URL`)
- ✅ GitHub OAuth App callback URL matches `${APP_URL}/api/auth/github/callback`
- ✅ SSL/TLS is configured (required for OAuth in production)
- ✅ Test login flow works correctly
- ✅ No redirect to localhost:3000

See the [OAuth Setup Guide](docs/OAUTH_SETUP.md) for detailed configuration instructions.

## Documentation

- **[OAuth Setup Guide](docs/OAUTH_SETUP.md)**: Complete guide for configuring GitHub OAuth authentication
- **[Octokit Guide](docs/OCTOKIT_GUIDE.md)**: Comprehensive reference for GitHub API integration
- **[AI Coding Instructions](.github/copilot-instructions.md)**: AI agent development guidelines

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- GitHub API via [Octokit](https://github.com/octokit/octokit.js)
- Drag-and-drop by [@dnd-kit](https://dndkit.com/)

## Support

For issues and questions, please [open an issue](https://github.com/SertayKabuk/github-org-manager/issues) on GitHub.
