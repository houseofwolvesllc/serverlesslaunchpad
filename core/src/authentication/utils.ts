export function getUserIdFromSession(session: string): string {
    return session.substring(32);
}
