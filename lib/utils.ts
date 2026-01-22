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
