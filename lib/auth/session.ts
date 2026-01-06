/**
 * Session management for GitHub OAuth tokens.
 * Uses iron-session for encrypted cookie-based sessions.
 */
import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  token?: string;
  user?: {
    login: string;
    id: number;
    avatar_url: string;
    name: string | null;
  };
  expiresAt?: string;
  scopes?: string[];
  loginType?: 'admin' | 'user';
}

/**
 * Gets the session configuration.
 * Cookie name and password are required for iron-session.
 */
function getSessionConfig() {
  const password = process.env.SESSION_SECRET;

  if (!password) {
    throw new Error(
      "Missing SESSION_SECRET environment variable. Generate a 32+ character random string."
    );
  }

  if (password.length < 32) {
    throw new Error(
      "SESSION_SECRET must be at least 32 characters long for security."
    );
  }

  return {
    password,
    cookieName: "github_org_manager_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    },
  };
}

/**
 * Gets the current session from cookies.
 * Use this in API routes and server components.
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionConfig());
}

/**
 * Checks if the user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session.token;
}

/**
 * Gets the OAuth token from the session or throws if not authenticated.
 */
export async function getToken(): Promise<string> {
  const session = await getSession();

  if (!session.token) {
    throw new Error("Not authenticated. Please login with GitHub.");
  }

  return session.token;
}

/**
 * Gets the authenticated user data from the session.
 */
export async function getUser() {
  const session = await getSession();
  return session.user || null;
}

/**
 * Saves OAuth token and user data to the session.
 */
export async function saveSession(
  token: string,
  user: SessionData["user"],
  options?: {
    expiresAt?: string;
    scopes?: string[];
    loginType?: 'admin' | 'user';
  }
): Promise<void> {
  const session = await getSession();
  session.token = token;
  session.user = user;

  if (options?.expiresAt) {
    session.expiresAt = options.expiresAt;
  }
  if (options?.scopes) {
    session.scopes = options.scopes;
  }
  if (options?.loginType) {
    session.loginType = options.loginType;
  }

  await session.save();
}

/**
 * Clears the session (logout).
 */
export async function clearSession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
