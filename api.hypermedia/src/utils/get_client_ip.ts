/**
 * Extract the true client IP address from request headers.
 *
 * When behind Cloudflare or other proxies, the X-Forwarded-For header contains
 * a comma-separated list of IPs. The first IP is the original client, and
 * subsequent IPs are the proxies that handled the request.
 *
 * Using the full X-Forwarded-For value for session signatures causes issues
 * because different proxy servers (e.g., Cloudflare edge nodes) add different IPs,
 * making the value inconsistent across requests from the same client.
 *
 * @param headers - Request headers object
 * @returns The client's IP address, or 'unknown' if not available
 */
export function getClientIp(headers: Record<string, string | undefined>): string {
    // Cloudflare provides the true client IP in this header
    const cfConnectingIp = headers['cf-connecting-ip'];
    if (cfConnectingIp) {
        return cfConnectingIp.trim();
    }

    // Fall back to first IP in X-Forwarded-For (the original client IP)
    const xForwardedFor = headers['x-forwarded-for'];
    if (xForwardedFor) {
        // X-Forwarded-For format: "client, proxy1, proxy2, ..."
        // We want only the client IP (first one)
        return xForwardedFor.split(',')[0].trim();
    }

    return 'unknown';
}
