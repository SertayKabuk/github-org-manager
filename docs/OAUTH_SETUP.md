# OAuth Setup Guide

## GitHub OAuth App Configuration

### 1. Create a GitHub OAuth App

1. Go to your GitHub settings: https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in the following details:
   - **Application name**: `GitHub Org Manager` (or your preferred name)
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`
   - **Description**: Optional

4. Click "Register application"
5. On the app page, note your **Client ID**
6. Click "Generate a new client secret" and save the **Client Secret** (you'll only see it once!)

### 2. Update Environment Variables

Update your `.env.local` file with the OAuth credentials:

```env
# GitHub OAuth App Credentials
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here

# Session Secret (generate a random 32+ character string)
# You can generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your_long_random_secret_here_at_least_32_characters

# Organization to manage
GITHUB_ORG=your-org-name

# Optional: Custom app name
NEXT_PUBLIC_APP_NAME=GitHub Org Manager

# Base URL (runtime-configurable, defaults to localhost:3000)
APP_URL=http://localhost:3000
```

### 3. Generate a Session Secret

Run this command to generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and set it as `SESSION_SECRET` in your `.env.local`.

### 4. Production Setup

For production deployments, you **MUST** configure the `APP_URL` environment variable to avoid redirect issues.

#### Step 1: Create Production OAuth App

Create a new OAuth App (or update the existing one) with production URLs:
- **Homepage URL**: `https://your-domain.com`
- **Authorization callback URL**: `https://your-domain.com/api/auth/github/callback`

#### Step 2: Configure Environment Variables

Set these environment variables in your deployment platform (Vercel, Railway, etc.):

```env
GITHUB_CLIENT_ID=prod_client_id
GITHUB_CLIENT_SECRET=prod_client_secret
SESSION_SECRET=prod_session_secret (different from dev!)
GITHUB_ORG=your-org-name
APP_URL=https://your-domain.com  # REQUIRED - must match your deployed URL
```

**⚠️ CRITICAL**: The `APP_URL` variable must be set to your actual deployment URL. Without it, OAuth redirects will fail and users will be redirected to `http://localhost:3000`.

#### Platform-Specific Examples

**Vercel:**
```bash
vercel env add APP_URL
# Enter: https://your-app.vercel.app
```

**Railway:**
```bash
railway variables set APP_URL=https://your-app.railway.app
```

**Docker/Self-hosted:**
Add to your `.env` file or docker-compose environment section.

**Note**: `APP_URL` is read at runtime, so you can use the same build for multiple environments by setting different values in each deployment.

### 5. Required OAuth Scopes

The OAuth flow requests the following scopes:
- `read:org` - Read organization data
- `admin:org` - Full organization access (required for team management)
- `user` - Read user profile information

## Migration from Static Token

If you're migrating from the static `GITHUB_TOKEN` approach:

1. The old `GITHUB_TOKEN` is no longer required for OAuth
2. API routes now use `getAuthenticatedOctokit()` instead of the singleton `octokit`
3. All API routes now check authentication with `requireAuth()`
4. Users must login via GitHub OAuth before accessing organization data

### Backwards Compatibility

The legacy `octokit` export is still available for server-side scripts, but is deprecated for API routes. Use `getAuthenticatedOctokit()` instead:

```typescript
// Old way (deprecated)
import { octokit } from "@/lib/octokit";
const teams = await octokit.rest.teams.list({ org });

// New way (OAuth)
import { getAuthenticatedOctokit } from "@/lib/octokit";
const octokit = await getAuthenticatedOctokit();
const teams = await octokit.rest.teams.list({ org });
```

## Testing

1. Start the dev server: `pnpm dev`
2. Navigate to `http://localhost:3000`
3. Click "Login with GitHub" in the header
4. Authorize the app on GitHub
5. You'll be redirected back and authenticated

## Troubleshooting

### "Missing SESSION_SECRET"
Generate a 32+ character random string and add it to `.env.local`.

### "Missing GitHub OAuth credentials"
Ensure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set in `.env.local`.

### "Not authenticated" errors
Click the "Login with GitHub" button to authenticate.

### OAuth callback errors
Verify the callback URL in your GitHub OAuth App matches: `http://localhost:3000/api/auth/github/callback`

### Redirects to localhost:3000 or 0.0.0.0:3000 in production
This means `APP_URL` is not set. Add it to your deployment environment variables with your actual production URL (e.g., `https://your-app.vercel.app`).

### Session not persisting
Check that cookies are enabled and `SESSION_SECRET` is properly configured.
