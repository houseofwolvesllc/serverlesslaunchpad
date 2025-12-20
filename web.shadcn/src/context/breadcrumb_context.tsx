/**
 * Breadcrumb Context
 *
 * Provides a way for child components (like HalResourceDetail) to update
 * the resource title in the breadcrumb trail.
 *
 * This enables dynamic breadcrumbs like:
 * Dashboard > Administration > Users > Keith Garcia
 * where "Keith Garcia" comes from the loaded HAL resource.
 */

import { createContext, useContext, useState, ReactNode } from 'react';

interface BreadcrumbContextValue {
    /** Current resource title (from HAL self link title) */
    resourceTitle: string | null;
    /** Set the resource title */
    setResourceTitle: (title: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
    const [resourceTitle, setResourceTitle] = useState<string | null>(null);

    return (
        <BreadcrumbContext.Provider value={{ resourceTitle, setResourceTitle }}>
            {children}
        </BreadcrumbContext.Provider>
    );
}

export function useBreadcrumb() {
    const context = useContext(BreadcrumbContext);
    if (!context) {
        throw new Error('useBreadcrumb must be used within BreadcrumbProvider');
    }
    return context;
}
