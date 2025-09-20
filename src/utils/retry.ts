export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });

export interface RetryOptions {
  // per attempt timeout
  baseDelayMs?: number; 
  // initial backoff
  factor?: number; 
  // backoff multiplier
  jitter?: boolean; 
  // add random jitter
  onRetry?: (attempt: number, error: unknown) => void; 
  retries?: number; 
  // total attempts (including first call)
  timeoutMs?: number;
}

const withTimeout = async <T>(factory: () => Promise<T>, timeoutMs = 2000): Promise<T> => {
  let timer: any;
  try {
    const race = Promise.race([
      factory(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError('Operation timed out')), timeoutMs);
      }),
    ]) as Promise<T>;
    return await race;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const retryAsync = async <T>(
  factory: () => Promise<T>,
  {
    retries = 3,
    timeoutMs = 2000,
    baseDelayMs = 300,
    factor = 2,
    jitter = true,
    onRetry,
  }: RetryOptions = {},
): Promise<T> => {
  let attempt = 0;
  let delay = baseDelayMs;

  // total attempts: retries (>=1)
  const total = Math.max(1, retries);

  while (attempt < total) {
    try {
      // per-attempt timeout
      return await withTimeout(factory, timeoutMs);
    } catch (error) {
      attempt += 1;
      if (attempt >= total) throw error;
      if (onRetry) onRetry(attempt, error);

      const wait = jitter ? delay + Math.random() * 100 : delay;
      await sleep(wait);
      delay *= factor;
    }
  }

  // should never reach here
  // @ts-ignore
  throw new Error('retryAsync unexpected fallthrough');
};

export const callWithRetry = async <T>(
  call: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> => retryAsync(call, options);


