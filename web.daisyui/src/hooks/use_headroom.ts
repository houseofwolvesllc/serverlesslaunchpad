import { useState, useEffect } from 'react'

interface UseHeadroomOptions {
    fixedAt?: number
}

/**
 * Custom hook to hide/show header on scroll
 * Replacement for Mantine's useHeadroom hook
 *
 * @param options - Configuration options
 * @returns boolean indicating if header should be pinned (visible)
 */
export function useHeadroom({ fixedAt = 0 }: UseHeadroomOptions = {}): boolean {
    const [pinned, setPinned] = useState(true)
    const [lastScrollY, setLastScrollY] = useState(0)

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY

            if (currentScrollY <= fixedAt) {
                // Always show header at the top
                setPinned(true)
            } else if (currentScrollY < lastScrollY) {
                // Scrolling up - show header
                setPinned(true)
            } else if (currentScrollY > lastScrollY) {
                // Scrolling down - hide header
                setPinned(false)
            }

            setLastScrollY(currentScrollY)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })

        return () => window.removeEventListener('scroll', handleScroll)
    }, [lastScrollY, fixedAt])

    return pinned
}
