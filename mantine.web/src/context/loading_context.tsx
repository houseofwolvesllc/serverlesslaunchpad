import * as React from 'react';

export const LoadingContext = React.createContext<{
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
}>({
    isLoading: false,
    setIsLoading: (isLoading: boolean) => {
        isLoading = isLoading;
    },
});
