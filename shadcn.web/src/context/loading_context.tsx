import * as React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
            <Dialog open={isLoading} modal={true}>
                <DialogContent className="border-0 bg-transparent shadow-none flex items-center justify-center">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </DialogContent>
            </Dialog>
        </LoadingContext.Provider>
    );
};
