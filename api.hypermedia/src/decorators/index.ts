/**
 * Decorator exports for cross-cutting concerns.
 *
 * Execution order (bottom to top in stack):
 * 1. @Protected - Validates credentials, checks authorization, and populates request.user
 * 2. @Log - Wraps entire execution with timing
 *
 * Note: ETag caching is handled at the controller level using checkNotModified()
 * and entity-specific ETag generation methods. This approach follows HATEOAS
 * principles where Cache-Control: no-cache ensures clients always revalidate.
 *
 * Example usage:
 * ```typescript
 * @Log()
 * @Protected({ role: Role.Support, allowOwner: true })
 * async getSessions(request: Request): Promise<Response> {
 *   // Generate ETag from entity data
 *   const etag = this.generateSessionsListETag(sessions, query, pagination);
 *
 *   // Check if client has current version (returns 304 if match)
 *   const notModified = this.checkNotModified(event, etag);
 *   if (notModified) return notModified;
 *
 *   // Return full response with ETag header
 *   return this.success(event, adapter, { headers: { 'ETag': etag } });
 * }
 * ```
 */

export { Protected } from './protected.js';
export { Log, Debug } from './log.js';