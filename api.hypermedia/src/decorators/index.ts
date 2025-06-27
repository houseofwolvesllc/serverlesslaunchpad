/**
 * Decorator exports for cross-cutting concerns.
 * 
 * Execution order (bottom to top in stack):
 * 1. @Cache - Checks If-None-Match first, may short-circuit with 304
 * 2. @Protected - Validates credentials, checks authorization, and populates request.user
 * 3. @Log - Wraps entire execution with timing
 * 
 * Example usage:
 * ```typescript
 * @Log()
 * @Protected({ role: Role.Support, allowOwner: true })
 * @Cache({ ttl: 300 })
 * async getSessions(request: Request): Promise<Response> {
 *   // Method implementation
 * }
 * ```
 */

export { Protected } from './protected';
export { Cache, CacheOptions } from './cache';
export { Log, Debug } from './log';