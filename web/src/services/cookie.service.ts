/**
 * Secure cookie management for session tokens
 * Provides client-side cookie utilities that work with server-side AuthenticationCookieRepository
 */

export class CookieService {
  private static readonly SESSION_COOKIE_NAME = 'session';

  /**
   * Check if session cookie exists
   */
  static hasSessionCookie(): boolean {
    return this.getCookie(this.SESSION_COOKIE_NAME) !== null;
  }

  /**
   * Get session cookie value
   */
  static getSessionToken(): string | null {
    return this.getCookie(this.SESSION_COOKIE_NAME);
  }

  /**
   * Remove session cookie (client-side only - for cleanup)
   * Note: Server should handle secure removal via /auth/revoke
   */
  static removeSessionCookie(): void {
    document.cookie = `${this.SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
  }

  /**
   * Generic cookie getter
   */
  private static getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1, c.length);
      }
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
  }

  /**
   * Check if any session-related cookies exist
   * Useful for determining if user might have an active session
   */
  static hasAnySessionData(): boolean {
    return this.hasSessionCookie();
  }
}