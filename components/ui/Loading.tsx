'use client';

interface LoadingProps {
  message?: string;
}

export function Loading({ message = "Loading..." }: LoadingProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 py-8 text-sm text-zinc-500">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
      <span>{message}</span>
    </div>
  );
}

export default Loading;
