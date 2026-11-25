/** Share build work between pages and allow the next call to retry a failure. */
export function memoizeBuild<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;

  return () => {
    if (!import.meta.env.PROD) return load();

    // FIXED: A failed build read must not poison subsequent callers.
    pending ??= load().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
}
