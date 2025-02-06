import { LoadingOverlay } from '@mantine/core';
import * as React from 'react';

export const useLoader = () => {
    const [isLoading, setIsLoading] = React.useState(false);

    return {
        <LoadingOverlay visible={isLoading} />
    }
};
