import type { FC, ReactNode } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import { HiChat } from 'react-icons/hi';
import { RiRefreshLine } from 'react-icons/ri';
import { Button } from '../../ui/button';

export interface ErrorFallbackProps extends FallbackProps {
  title?: string;
  showDetails?: boolean;
  actions?: ReactNode;
}

export const ErrorFallback: FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  title = 'Oops, something went wrong!',
  showDetails = import.meta.env.DEV,
  actions,
}) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
      <div className="flex-center gap-2 text-lg font-medium text-red-700 dark:text-red-400">
        <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        {title}
      </div>

      {showDetails && errorMessage && (
        <div className="w-full rounded-md bg-red-100 p-3 font-mono text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <p className="font-semibold">Error: {errorMessage}</p>
          {import.meta.env.DEV && errorStack && (
            <pre className="mt-2 max-h-32 overflow-auto text-xs whitespace-pre-wrap opacity-70">
              {errorStack}
            </pre>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actions ?? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={resetErrorBoundary}
              className="gap-1.5">
              <RiRefreshLine className="size-4" />
              Try Again
            </Button>
            <a
              href="https://github.com/XueHua-s/astro-snow/issues/new"
              target="_blank"
              rel="noreferrer"
              className="flex-center gap-1.5 text-sm text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              <HiChat className="size-4" />
              Report Issue
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export const InlineErrorFallback: FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    <div className="flex-center-y gap-2 text-lg text-red-600 dark:text-red-400">
      <span>Error{errorMessage ? `: ${errorMessage}` : ''}</span>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={resetErrorBoundary}
          className="gap-1.5">
          <RiRefreshLine className="size-4" />
          Try Again
        </Button>
        <a
          href="https://github.com/XueHua-s/astro-snow/issues/new"
          target="_blank"
          rel="noreferrer">
          <Button variant="outline" size="sm" className="gap-1.5">
            <HiChat className="size-4" />
            Report Issue
          </Button>
        </a>
      </div>
    </div>
  );
};
