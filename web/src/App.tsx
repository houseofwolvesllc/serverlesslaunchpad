import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { Router } from './components/router';
import { LoadingOverlay, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter } from 'react-router-dom';
import { LoadingContext } from './context/loading_context';
import { AuthenticationProvider } from './features/authentication/providers/authentication_provider';
import { useState } from 'react';

export const App = () => {
    const [isLoading, setIsLoading] = useState(false);

    return (
        <MantineProvider>
            <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
                <LoadingOverlay visible={isLoading} />
                <BrowserRouter>
                    <Notifications />
                    <AuthenticationProvider>
                        <Router />
                    </AuthenticationProvider>
                </BrowserRouter>
            </LoadingContext.Provider>
        </MantineProvider>
    );
};
