import { useState, useCallback } from 'react'

/**
 * Custom hook to manage boolean state (open/close, visible/hidden, etc.)
 * Replacement for Mantine's useDisclosure hook
 */
export function useDisclosure(initialState = false): [boolean, { open: () => void; close: () => void; toggle: () => void }] {
    const [opened, setOpened] = useState(initialState)

    const open = useCallback(() => setOpened(true), [])
    const close = useCallback(() => setOpened(false), [])
    const toggle = useCallback(() => setOpened((prev) => !prev), [])

    return [opened, { open, close, toggle }]
}
