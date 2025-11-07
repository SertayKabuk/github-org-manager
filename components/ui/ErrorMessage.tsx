"use client";

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-red-500 bg-red-100 dark:bg-red-950 dark:border-red-800 px-4 py-3 text-sm text-red-900 dark:text-red-100">
      <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-200 dark:bg-red-900 font-semibold text-red-900 dark:text-red-100">
        !
      </span>
      <p className="flex-1 font-medium">{message}</p>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss error"
          onClick={onDismiss}
          className="rounded-full p-1 text-red-900 dark:text-red-100 transition hover:bg-red-200 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          <span className="sr-only">Dismiss</span>
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
