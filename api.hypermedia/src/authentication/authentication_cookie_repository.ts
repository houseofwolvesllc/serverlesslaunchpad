import { ALBEvent, ALBResult } from "aws-lambda";

/**
 * Repository for managing authentication session cookies.
 * Handles secure cookie operations for browser-based API navigation.
 */
export class AuthenticationCookieRepository {
    private static readonly COOKIE_NAME = 'slp_session';
    private static readonly COOKIE_OPTIONS = {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict' as const,
        path: '/'
    };

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
    static set(
        response: ALBResult, 
        token: string, 
        expiresIn: number
    ): void {
        const cookieValue = this.buildCookieValue(token, expiresIn);
        
        // Ensure headers object exists
        if (!response.headers) {
            response.headers = {};
        }
        
        // Set cookie header
        response.headers['Set-Cookie'] = cookieValue;
    }

    /**
     * Remove session token cookie
     */
    static remove(response: ALBResult): void {
        // Ensure headers object exists
        if (!response.headers) {
            response.headers = {};
        }
        
        // Set expired cookie to remove it
        response.headers['Set-Cookie'] = `${this.COOKIE_NAME}=; Path=${this.COOKIE_OPTIONS.path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict`;
    }


    /**
     * Parse cookie header string into key-value pairs
     */
    private static parseCookies(cookieHeader: string): Record<string, string> {
        const cookies: Record<string, string> = {};
        
        cookieHeader.split(';').forEach(cookie => {
            const [name, ...rest] = cookie.trim().split('=');
            if (name && rest.length > 0) {
                cookies[name] = rest.join('=');
            }
        });
        
        return cookies;
    }

    /**
     * Build cookie value string with all security attributes
     */
    private static buildCookieValue(token: string, expiresIn: number): string {
        const expireDate = new Date(Date.now() + expiresIn * 1000).toUTCString();
        
        return [
            `${this.COOKIE_NAME}=${token}`,
            `Path=${this.COOKIE_OPTIONS.path}`,
            `Expires=${expireDate}`,
            'HttpOnly',
            'Secure',
            `SameSite=${this.COOKIE_OPTIONS.sameSite}`
        ].join('; ');
    }
}