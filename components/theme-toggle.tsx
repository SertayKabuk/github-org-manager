'use client';

import dynamic from 'next/dynamic';
import { Sun } from 'lucide-react';

const ThemeToggleButton = dynamic(
  () => import('./theme-toggle-client').then((module) => module.ThemeToggleClient),
  {
    ssr: false,
    loading: () => (
      <button
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        disabled
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4" />
      </button>
    ),
  }
);

export function ThemeToggle() {
  return <ThemeToggleButton />;
}
