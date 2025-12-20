import { ALBEvent, ALBResult } from "aws-lambda";

/**
 * Repository for managing authentication session cookies.
 * Handles secure cookie operations for browser-based API navigation.
 */
export class AuthenticationCookieRepository {
    private static readonly COOKIE_NAME = "slp_session";
    private static readonly COOKIE_OPTIONS = {
        httpOnly: true,
        secure: true,
        sameSite: "Lax" as const, // Lax allows cookies on top-level cross-subdomain navigations
        path: "/",
    };

    // Cookie domain for cross-subdomain sharing (e.g., ".serverlesslaunchpad.com")
    private static cookieDomain: string | undefined;

    /**
     * Initialize the cookie repository with domain configuration.
     * Call this during application startup.
     * @param domain The cookie domain (e.g., ".serverlesslaunchpad.com") or undefined for same-host only
     */
    static initialize(domain?: string): void {
        this.cookieDomain = domain;
    }

    /**
     * Check if session cookie is set in the cookie header
     */
    static isSet(cookieHeader: string | undefined): boolean {
        if (!cookieHeader) return false;
        return cookieHeader.includes(this.COOKIE_NAME);
    }

    /**
     * Get session token from cookie
     */
    static get(event: ALBEvent): string | null {
        const cookieHeader = event.headers?.cookie || event.headers?.Cookie;
        if (!cookieHeader) return null;

        // Parse cookies manually since ALB doesn't provide a cookies object
        const cookies = this.parseCookies(cookieHeader);
        return cookies[this.COOKIE_NAME] || null;
    }

    /**
     * Set session token cookie
     */
    static set(response: ALBResult, token: string, expiresIn: number): void {
        const cookieValue = this.buildCookieValue(token, expiresIn);

        // Ensure headers object exists
        if (!response.headers) {
            response.headers = {};
        }

        // Set cookie header
        response.headers["Set-Cookie"] = cookieValue;
    }

    /**
     * Remove session token cookie
     */
    static remove(response: ALBResult): void {
        // Ensure headers object exists
        if (!response.headers) {
            response.headers = {};
        }

        // Build removal cookie with same attributes used for setting
        const parts = [
            `${this.COOKIE_NAME}=`,
            `Path=${this.COOKIE_OPTIONS.path}`,
            "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
            "HttpOnly",
            "Secure",
            `SameSite=${this.COOKIE_OPTIONS.sameSite}`,
        ];

        if (this.cookieDomain) {
            parts.push(`Domain=${this.cookieDomain}`);
        }

        response.headers["Set-Cookie"] = parts.join("; ");
    }

    /**
     * Parse cookie header string into key-value pairs
     */
    private static parseCookies(cookieHeader: string): Record<string, string> {
        const cookies: Record<string, string> = {};

        cookieHeader.split(";").forEach((cookie) => {
            const [name, ...rest] = cookie.trim().split("=");
            if (name && rest.length > 0) {
                cookies[name.trim()] = rest.join("=").trim();
            }
        });

        return cookies;
    }

    /**
     * Build cookie value string with all security attributes
     */
    private static buildCookieValue(token: string, expiresIn: number): string {
        const expireDate = new Date(Date.now() + expiresIn * 1000).toUTCString();

        const parts = [
            `${this.COOKIE_NAME}=${token}`,
            `Path=${this.COOKIE_OPTIONS.path}`,
            `Expires=${expireDate}`,
            "HttpOnly",
            "Secure",
            `SameSite=${this.COOKIE_OPTIONS.sameSite}`,
        ];

        // Add domain if configured for cross-subdomain sharing
        if (this.cookieDomain) {
            parts.push(`Domain=${this.cookieDomain}`);
        }

        return parts.join("; ");
    }
}
