// Keep account checks bounded without timing out uploads or AI evaluations.
export const AUTH_REQUEST_TIMEOUT_MS = 10_000;
export const AUTH_RETRY_INITIAL_DELAY_MS = 5_000;
export const AUTH_RETRY_MAX_DELAY_MS = 30_000;
export const AUTH_INITIAL_FAILURE_GRACE_MS = 7_000;
