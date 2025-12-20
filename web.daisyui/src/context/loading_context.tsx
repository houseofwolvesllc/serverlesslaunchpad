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

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = React.useState(false);

    return (
        <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
            {children}
            {/* DaisyUI modal for loading overlay */}
            <dialog className="modal" open={isLoading}>
                <div className="modal-box bg-transparent border-0 shadow-none flex items-center justify-center">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
                <div className="modal-backdrop bg-base-300/50"></div>
            </dialog>
        </LoadingContext.Provider>
    );
};

export const useLoading = () => {
    const context = React.useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};
