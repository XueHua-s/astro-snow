import type { ComponentProps, FC, PropsWithChildren } from 'react';
import {
  ErrorBoundary as ErrorBoundaryLib,
  useErrorBoundary,
  withErrorBoundary as withErrorBoundaryLib,
} from 'react-error-boundary';
import { ErrorFallback, InlineErrorFallback } from './error-boundary/fallbacks';

export type { ErrorFallbackProps } from './error-boundary/fallbacks';
export { ErrorFallback, InlineErrorFallback };

export interface ErrorBoundaryProps extends PropsWithChildren {
  fallback?: ComponentProps<typeof ErrorBoundaryLib>['fallback'];
  fallbackRender?: ComponentProps<typeof ErrorBoundaryLib>['fallbackRender'];
  FallbackComponent?: ComponentProps<
    typeof ErrorBoundaryLib
  >['FallbackComponent'];
  onError?: (error: Error, info: React.ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
}

export const ErrorBoundary: FC<ErrorBoundaryProps> = ({
  children,
  fallback,
  fallbackRender,
  FallbackComponent,
  onError,
  onReset,
  resetKeys,
}) => {
  const handleError = (error: Error, info: React.ErrorInfo) => {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info);
    }
    onError?.(error, info);
  };

  const commonProps = { onError: handleError, onReset, resetKeys };

  if (fallback !== undefined) {
    return (
      <ErrorBoundaryLib {...commonProps} fallback={fallback}>
        {children}
      </ErrorBoundaryLib>
    );
  }

  if (fallbackRender !== undefined) {
    return (
      <ErrorBoundaryLib {...commonProps} fallbackRender={fallbackRender}>
        {children}
      </ErrorBoundaryLib>
    );
  }

  return (
    <ErrorBoundaryLib
      {...commonProps}
      FallbackComponent={FallbackComponent ?? ErrorFallback}>
      {children}
    </ErrorBoundaryLib>
  );
};

export { useErrorBoundary, withErrorBoundaryLib as withErrorBoundary };
