// React Native's HTTP client has no timeouts, and auth-js passes no abort signal, so a half-open connection could hang
// a sync forever (M4 code review). Every request the Supabase client makes goes through this: aborted after `ms`, or
// when the caller's own signal aborts.
export function timedFetch(ms: number, base: typeof fetch = fetch): typeof fetch {
  return (input, init = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const outer = init.signal;
    if (outer) {
      if (outer.aborted) controller.abort();
      else outer.addEventListener('abort', () => controller.abort(), { once: true });
    }
    return base(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}
