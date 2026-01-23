/**
 * Retry utility with exponential backoff
 * Helps the app recover from temporary network issues or Supabase congestion
 */

export interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: any) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    shouldRetry: (error: any) => {
        // Retry on network errors, 5xx server errors, and rate limits (429)
        if (!error) return false;
        if (error.message?.includes('Failed to fetch')) return true;
        if (error.message?.includes('NetworkError')) return true;
        if (error.code === 'PGRST301') return true; // Supabase connection error
        const status = error.status || error.code;
        return status === 429 || (status >= 500 && status < 600);
    }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wraps an async function with retry logic and exponential backoff
 * @param fn - The async function to retry
 * @param options - Retry configuration
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...defaultOptions, ...options };
    let lastError: any;
    let delay = opts.initialDelayMs;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Don't retry on final attempt or if error is not retryable
            if (attempt === opts.maxRetries || !opts.shouldRetry(error)) {
                throw error;
            }

            console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error.message);
            await sleep(delay);

            // Exponential backoff with jitter
            delay = Math.min(delay * 2 + Math.random() * 100, opts.maxDelayMs);
        }
    }

    throw lastError;
}

/**
 * Helper specifically for Supabase operations
 * Usage: await supabaseRetry(() => supabase.from('table').select('*'))
 */
export async function supabaseRetry<T>(
    operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
    return withRetry(async () => {
        const result = await operation();

        // If Supabase returned an error that's retryable, throw it
        if (result.error && defaultOptions.shouldRetry(result.error)) {
            throw result.error;
        }

        return result;
    });
}
