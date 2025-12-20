import * as React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingContext = React.createContext<{
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
}>({
    isLoading: false,
    setIsLoading: (isLoading: boolean) => {
        isLoading = isLoading;
    },
});

/**
 * Loading overlay component - semantic, accessible, non-interactive
 */
function LoadingOverlay() {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            role="status"
            aria-busy="true"
            aria-label="Loading"
        >
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <span className="sr-only">Loading, please wait...</span>
        </div>
    );
}

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = React.useState(false);

    return (
        <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
            {children}
            {isLoading && <LoadingOverlay />}
        </LoadingContext.Provider>
    );
};
