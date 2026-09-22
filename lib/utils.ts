import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const BASE_PATH = "/github";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Prepends the application base path to a given path.
 * Ensures no double slashes.
 */
export function withBasePath(path: string): string {
  if (path.startsWith(BASE_PATH)) return path;

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${cleanPath}`;
}

/**
 * Formats a Date as YYYY-MM-DD using its local calendar date, for <input type="date">.
 * Avoids toISOString(), which converts to UTC first and can shift the day in
 * timezones ahead of UTC.
 */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
