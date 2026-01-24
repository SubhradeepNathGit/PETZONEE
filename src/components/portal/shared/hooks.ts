import { useCallback, useEffect, useState } from 'react';

export function useAsyncError() {
  const [error, setError] = useState<Error | null>(null);
  const throwError = useCallback((err: Error) => {
    setError(err);
    throw err;
  }, []);
  if (error) throw error;
  return throwError;
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
