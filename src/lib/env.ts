/**
 * Returns a getter function for a required server-side environment variable.
 * The check is deferred to runtime (first call), so it won't break `next build`.
 * Throws a descriptive error if the variable is missing when actually accessed.
 */
export function env(name: string): () => string {
  let cached: string | undefined;
  return () => {
    if (cached === undefined) {
      const v = process.env[name];
      if (!v) throw new Error(`[env] Missing required environment variable: ${name}`);
      cached = v;
    }
    return cached;
  };
}

/**
 * Eagerly reads and validates an env var.
 * Safe to call inside function bodies (runtime), but NOT at module level
 * (would break `next build` for server-only vars).
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return value;
}
