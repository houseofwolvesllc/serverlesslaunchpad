import { useState, useEffect } from 'react'

/**
 * Custom hook to detect media query matches
 * Replacement for Mantine's useMediaQuery hook
 *
 * @param query - Media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        const mediaQuery = window.matchMedia(query)

        // Set initial value
        setMatches(mediaQuery.matches)

        // Create event listener
        const handler = (event: MediaQueryListEvent) => {
            setMatches(event.matches)
        }

        // Add listener
        mediaQuery.addEventListener('change', handler)

        // Cleanup
        return () => mediaQuery.removeEventListener('change', handler)
    }, [query])

    return matches
}
