# Octokit.js - Complete Usage Guide

> The all-batteries-included GitHub SDK for Browsers, Node.js, and Deno

## Overview

Octokit.js is the official GitHub SDK that provides a comprehensive interface for interacting with GitHub's REST API, GraphQL API, webhooks, and OAuth authentication. It combines three main components:

1. **API Client** - REST API requests, GraphQL queries, and authentication
2. **App Client** - GitHub Apps, webhooks, and OAuth flows
3. **Action Client** - Pre-authenticated client for GitHub Actions

## Key Features

- ✅ **Complete** - Covers all features of GitHub's Platform APIs
- ✅ **Prescriptive** - Implements all recommended best practices
- ✅ **Universal** - Works in browsers, Node.js, and Deno
- ✅ **Tested** - 100% test coverage
- ✅ **Typed** - Full TypeScript support
- ✅ **Decomposable** - Use only what you need
- ✅ **Extendable** - Plugin system for custom functionality

---

## Installation

### NPM/PNPM/Yarn
```bash
npm install octokit
# or
pnpm install octokit
# or
yarn add octokit
```

### ESM (Browser/Deno)
```javascript
import { Octokit, App } from "https://esm.sh/octokit";
```

### TypeScript Configuration

⚠️ **Important**: Due to conditional exports, update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "node16",
    "module": "node16"
  }
}
```

---

## 1. Octokit API Client

### Basic Setup

```javascript
import { Octokit } from "octokit";

// Create instance with personal access token
const octokit = new Octokit({ 
  auth: 'ghp_your_personal_access_token'
});

// Get authenticated user
const { data: { login } } = await octokit.rest.users.getAuthenticated();
console.log("Hello, %s", login);
```

### Constructor Options

#### Essential Options

| Option | Type | Description |
|--------|------|-------------|
| `auth` | String/Object | Personal access token or auth strategy options |
| `authStrategy` | Function | Custom authentication strategy (default: `@octokit/auth-token`) |
| `userAgent` | String | Custom user agent (prepends to default) |
| `baseUrl` | String | GitHub Enterprise Server URL (e.g., `https://github.acme-inc.com/api/v3`) |

```javascript
// Custom user agent
const octokit = new Octokit({
  userAgent: "my-app/v1.2.3",
  auth: "token123"
});

// GitHub Enterprise Server
const octokit = new Octokit({
  baseUrl: "https://github.acme-inc.com/api/v3",
  auth: "token123"
});
```

#### Advanced Options

| Option | Type | Description |
|--------|------|-------------|
| `request` | Object | Custom request options (signal, fetch, timeout) |
| `timeZone` | String | Timezone for commit timestamps (e.g., "America/Los_Angeles") |
| `throttle` | Object | Rate limit handling configuration |
| `retry` | Object | Request retry configuration |

```javascript
const octokit = new Octokit({
  timeZone: "America/Los_Angeles",
  request: {
    timeout: 5000,
    signal: abortController.signal
  },
  throttle: {
    onRateLimit: (retryAfter, options, octokit) => {
      console.warn(`Rate limit hit for ${options.method} ${options.url}`);
      if (options.request.retryCount === 0) {
        console.log(`Retrying after ${retryAfter} seconds`);
        return true; // Retry once
      }
    },
    onSecondaryRateLimit: (retryAfter, options, octokit) => {
      console.warn(`Secondary rate limit hit`);
    }
  },
  retry: {
    enabled: true // Enable automatic retries
  }
});
```

---

## 2. Authentication

### Personal Access Token (Default)

```javascript
const octokit = new Octokit({ 
  auth: 'ghp_your_token' 
});
```

### GitHub App Authentication

```javascript
import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";

const octokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: 1,
    privateKey: "-----BEGIN PRIVATE KEY-----\n...",
    installationId: 123
  }
});

// Authenticates as app
const { data: { slug } } = await octokit.rest.apps.getAuthenticated();

// Creates installation access token automatically
await octokit.rest.issues.create({
  owner: "octocat",
  repo: "hello-world",
  title: "Hello from " + slug
});
```

### Using App Client (Recommended for Apps)

```javascript
import { App } from "octokit";

const app = new App({ appId, privateKey });
const { data: { slug } } = await app.octokit.rest.apps.getAuthenticated();

// Get installation-specific client
const octokit = await app.getInstallationOctokit(123);
await octokit.rest.issues.create({
  owner: "octocat",
  repo: "hello-world",
  title: "Hello from " + slug
});
```

---

## 3. REST API Usage

### Method 1: Endpoint Methods (Recommended)

```javascript
// Create an issue
await octokit.rest.issues.create({
  owner: "octocat",
  repo: "hello-world",
  title: "Hello, world!",
  body: "I created this issue using Octokit!"
});

// List repositories
const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser();

// Get repository content
const { data } = await octokit.rest.repos.getContent({
  owner: "octocat",
  repo: "hello-world",
  path: "README.md"
});
```

### Method 2: Direct Request

```javascript
// Same as above, using octokit.request()
await octokit.request("POST /repos/{owner}/{repo}/issues", {
  owner: "octocat",
  repo: "hello-world",
  title: "Hello, world!",
  body: "I created this issue using Octokit!"
});
```

Both methods are equivalent - `octokit.rest.*` methods use `octokit.request()` internally.

---

## 4. Pagination

### Async Iterator (Memory Efficient)

```javascript
// Iterate through all issues
const iterator = octokit.paginate.iterator(
  octokit.rest.issues.listForRepo,
  {
    owner: "octocat",
    repo: "hello-world",
    per_page: 100
  }
);

for await (const { data: issues } of iterator) {
  for (const issue of issues) {
    console.log("Issue #%d: %s", issue.number, issue.title);
  }
}
```

### Get All Items at Once

```javascript
// Retrieve all issues in a single call
const allIssues = await octokit.paginate(
  octokit.rest.issues.listForRepo,
  {
    owner: "octocat",
    repo: "hello-world",
    per_page: 100
  }
);

console.log(`Total issues: ${allIssues.length}`);
```

---

## 5. GraphQL API

### Basic Queries

```javascript
// Simple query
const { viewer: { login } } = await octokit.graphql(`{
  viewer {
    login
  }
}`);

console.log("Logged in as:", login);
```

### Queries with Variables

```javascript
const { lastIssues } = await octokit.graphql(
  `query lastIssues($owner: String!, $repo: String!, $num: Int = 3) {
    repository(owner: $owner, name: $repo) {
      issues(last: $num) {
        edges {
          node {
            title
            number
          }
        }
      }
    }
  }`,
  {
    owner: "octokit",
    repo: "graphql.js"
  }
);
```

### GraphQL Pagination

```javascript
const { allIssues } = await octokit.graphql.paginate(
  `query allIssues($owner: String!, $repo: String!, $num: Int = 10, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      issues(first: $num, after: $cursor) {
        edges {
          node {
            title
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }`,
  {
    owner: "octokit",
    repo: "graphql.js"
  }
);
```

### Schema Previews

```javascript
await octokit.graphql(
  `mutation createLabel($repositoryId: ID!, $name: String!, $color: String!) {
    createLabel(input: {repositoryId: $repositoryId, name: $name, color: $color}) {
      label {
        id
      }
    }
  }`,
  {
    repositoryId: 1,
    name: "important",
    color: "cc0000",
    mediaType: {
      previews: ["bane"]
    }
  }
);
```

---

## 6. Error Handling

```javascript
import { RequestError } from "octokit";

try {
  await octokit.request("GET /repos/{owner}/{repo}", {
    owner: "octocat",
    repo: "hello-world"
  });
} catch (error) {
  if (error instanceof RequestError) {
    console.error("GitHub API Error:", error.message);
    console.error("Status:", error.status);
    console.error("Request:", error.request);
    console.error("Response:", error.response);
  } else {
    throw error;
  }
}
```

---

## 7. Media Type Formats

```javascript
// Get raw content of a file
const { data } = await octokit.rest.repos.getContent({
  mediaType: {
    format: "raw"
  },
  owner: "octocat",
  repo: "hello-world",
  path: "package.json"
});

const packageInfo = JSON.parse(data);
console.log("Package name:", packageInfo.name);
```

---

## 8. Proxy Servers (Node.js)

### Using Undici ProxyAgent

```javascript
import { fetch as undiciFetch, ProxyAgent } from 'undici';

const myFetch = (url, options) => {
  return undiciFetch(url, {
    ...options,
    dispatcher: new ProxyAgent('http://proxy.example.com:8080')
  });
};

const octokit = new Octokit({
  request: {
    fetch: myFetch
  }
});
```

### Per-Request Proxy

```javascript
octokit.rest.repos.get({
  owner: "octocat",
  repo: "hello-world",
  request: {
    fetch: myFetch
  }
});
```

---

## 9. App Client

### GitHub App Setup

```javascript
import { App } from "octokit";

const app = new App({ 
  appId: 12345, 
  privateKey: process.env.PRIVATE_KEY 
});

// Iterate through all installations
for await (const { octokit, repository } of app.eachRepository.iterator()) {
  await octokit.rest.repos.createDispatchEvent({
    owner: repository.owner.login,
    repo: repository.name,
    event_type: "my_event",
    client_payload: { foo: "bar" }
  });
  console.log("Event dispatched for", repository.full_name);
}
```

### Get Installation Client

```javascript
const octokit = await app.getInstallationOctokit(123);
// Use octokit as normal, authenticated as installation #123
```

---

## 10. Webhooks

### Node.js Server

```javascript
import { createServer } from "node:http";
import { App, createNodeMiddleware } from "octokit";

const app = new App({
  appId: 12345,
  privateKey: process.env.PRIVATE_KEY,
  webhooks: { secret: process.env.WEBHOOK_SECRET }
});

// Handle issue creation
app.webhooks.on("issues.opened", async ({ octokit, payload }) => {
  await octokit.rest.issues.createComment({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    body: "Hello, World!"
  });
});

// Start server - webhooks available at /api/github/webhooks
createServer(createNodeMiddleware(app)).listen(3000);
```

### Serverless Environments

```javascript
// Explicitly verify and receive webhook
await app.webhooks.verifyAndReceive({
  id: request.headers["x-github-delivery"],
  name: request.headers["x-github-event"],
  signature: request.headers["x-hub-signature-256"],
  payload: request.body
});
```

---

## 11. OAuth

### OAuth Web Flow (Server)

```javascript
import { App, createNodeMiddleware } from "octokit";
import { createServer } from "node:http";

const app = new App({
  oauth: { 
    clientId: process.env.CLIENT_ID, 
    clientSecret: process.env.CLIENT_SECRET 
  }
});

// Handle successful authentication
app.oauth.on("token.created", async ({ token, octokit }) => {
  // User is authenticated, octokit is ready to use
  await octokit.rest.activity.setRepoSubscription({
    owner: "octocat",
    repo: "hello-world",
    subscribed: true
  });
});

// OAuth routes:
// - /api/github/oauth/login (initiate flow)
// - /api/github/oauth/callback (redirect endpoint)
createServer(createNodeMiddleware(app)).listen(3000);
```

### OAuth Device Flow

```javascript
const { token } = await app.oauth.createToken({
  async onVerification(verification) {
    console.log("Open:", verification.verification_uri);
    console.log("Enter code:", verification.user_code);
  }
});
```

### Exchange Code for Token (Serverless)

```javascript
const { token } = await app.oauth.createToken({
  code: request.query.code
});

const octokit = new Octokit({ auth: token });
```

---

## 12. OAuth for Browser Apps

```javascript
// In browser - after OAuth redirect
const code = new URL(location.href).searchParams.get("code");

if (code) {
  // Clean URL
  const path = location.pathname + 
    location.search.replace(/\b(code|state)=\w+/g, "").replace(/[?&]+$/, "");
  history.replaceState({}, "", path);

  // Exchange code for token with backend
  const response = await fetch("/api/github/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code })
  });
  
  const { token } = await response.json();

  // Use token
  const { Octokit } = await import("https://esm.sh/@octokit/core");
  const octokit = new Octokit({ auth: token });

  const { data: { login } } = await octokit.request("GET /user");
  console.log("Hi there,", login);
}
```

---

## 13. App Server Routes

When using `createNodeMiddleware()`, the following routes are exposed:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/github/webhooks` | POST | Receive webhook events |
| `/api/github/oauth/login` | GET | Initiate OAuth flow (accepts `?state` and `?scopes`) |
| `/api/github/oauth/callback` | GET | OAuth redirect endpoint |
| `/api/github/oauth/token` | POST | Exchange code for token |
| `/api/github/oauth/token` | GET | Validate token |
| `/api/github/oauth/token` | PATCH | Reset token |
| `/api/github/oauth/token` | DELETE | Revoke token (logout) |
| `/api/github/oauth/refresh-token` | PATCH | Refresh expiring token |
| `/api/github/oauth/token/scoped` | POST | Create scoped token |
| `/api/github/oauth/grant` | DELETE | Revoke grant (uninstall) |

### Express Integration

```javascript
import express from "express";
import { App, createNodeMiddleware } from "octokit";

const expressApp = express();
const octokitApp = new App({
  appId: 12345,
  privateKey: process.env.PRIVATE_KEY,
  webhooks: { secret: process.env.WEBHOOK_SECRET },
  oauth: { 
    clientId: process.env.CLIENT_ID, 
    clientSecret: process.env.CLIENT_SECRET 
  }
});

expressApp.use(createNodeMiddleware(octokitApp));

expressApp.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

---

## 14. Node.js Compatibility

### Fetch Requirement

Octokit requires **Node.js 18+** which includes native fetch API.

For older versions, provide a custom fetch implementation:

```javascript
import fetch from "node-fetch";

const octokit = new Octokit({
  request: {
    fetch: fetch
  }
});
```

---

## 15. Common Patterns

### List All Repositories for Organization

```javascript
const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
  org: "github",
  type: "public",
  per_page: 100
});

console.log(`Found ${repos.length} repositories`);
```

### Create Issue with Labels

```javascript
await octokit.rest.issues.create({
  owner: "octocat",
  repo: "hello-world",
  title: "Bug Report",
  body: "Something is broken",
  labels: ["bug", "high-priority"],
  assignees: ["octocat"]
});
```

### Update File Contents

```javascript
// Get current file
const { data: file } = await octokit.rest.repos.getContent({
  owner: "octocat",
  repo: "hello-world",
  path: "README.md"
});

// Update file
await octokit.rest.repos.createOrUpdateFileContents({
  owner: "octocat",
  repo: "hello-world",
  path: "README.md",
  message: "Update README",
  content: Buffer.from("# New Content").toString("base64"),
  sha: file.sha
});
```

### Search Code

```javascript
const { data } = await octokit.rest.search.code({
  q: "addClass in:file language:js repo:jquery/jquery"
});

console.log(`Found ${data.total_count} results`);
```

### List Pull Requests

```javascript
const prs = await octokit.paginate(octokit.rest.pulls.list, {
  owner: "octocat",
  repo: "hello-world",
  state: "open",
  per_page: 100
});
```

---

## 16. TypeScript Support

Octokit is fully typed:

```typescript
import { Octokit } from "octokit";

const octokit = new Octokit({ auth: "token123" });

// Full type inference
const { data } = await octokit.rest.repos.get({
  owner: "octocat",
  repo: "hello-world"
});

// data is typed as Repository
console.log(data.full_name);
console.log(data.stargazers_count);
```

---

## 17. Best Practices

### 1. Always Set User Agent
```javascript
const octokit = new Octokit({
  userAgent: "my-app/v1.0.0",
  auth: token
});
```

### 2. Handle Rate Limits
```javascript
const octokit = new Octokit({
  throttle: {
    onRateLimit: (retryAfter, options, octokit) => {
      octokit.log.warn(`Rate limit hit`);
      if (options.request.retryCount === 0) {
        return true; // Retry once
      }
    }
  }
});
```

### 3. Use Pagination for Large Datasets
```javascript
// ✅ Good - memory efficient
for await (const { data } of octokit.paginate.iterator(...)) {
  // Process data
}

// ❌ Avoid - loads all data into memory
const allData = await octokit.paginate(...);
```

### 4. Error Handling
```javascript
import { RequestError } from "octokit";

try {
  await octokit.rest.repos.get({...});
} catch (error) {
  if (error instanceof RequestError) {
    console.error("GitHub API Error:", error.status);
  }
}
```

### 5. Use Environment Variables for Secrets
```javascript
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});
```

---

## 18. Resources

- **Official Repository**: https://github.com/octokit/octokit.js
- **REST API Docs**: https://docs.github.com/rest
- **GraphQL API Docs**: https://docs.github.com/graphql
- **Authentication Strategies**: https://github.com/octokit/authentication-strategies.js
- **Webhooks**: https://docs.github.com/webhooks
- **OAuth Apps**: https://docs.github.com/developers/apps/authorizing-oauth-apps

---

## 19. Standalone Modules

Octokit is decomposable. You can use standalone modules:

- `@octokit/core` - Minimal Octokit client
- `@octokit/rest` - REST API endpoints
- `@octokit/graphql` - GraphQL client
- `@octokit/auth-token` - Token authentication
- `@octokit/auth-app` - GitHub App authentication
- `@octokit/webhooks` - Webhook handling
- `@octokit/request` - HTTP request client
- `@octokit/plugin-paginate-rest` - REST pagination
- `@octokit/plugin-throttling` - Rate limiting

---

## 20. License

MIT License - See https://github.com/octokit/octokit.js/blob/main/LICENSE

---

**Last Updated**: November 2025  
**Octokit Version**: 5.0.5+
