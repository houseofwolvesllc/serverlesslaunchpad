import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { Router } from './components/router';
import { LoadingOverlay, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { BrowserRouter } from 'react-router-dom';
import { LoadingContext } from './context/loading_context';
import { AuthenticationProvider } from './features/authentication/providers/authentication_provider';
import { useState } from 'react';
import { theme } from './theme';

export const App = () => {
    const [isLoading, setIsLoading] = useState(false);

    return (
        <MantineProvider theme={theme} defaultColorScheme="auto">
            <ModalsProvider>
                <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
                    <LoadingOverlay visible={isLoading} />
                    <BrowserRouter>
                        <Notifications />
                        <AuthenticationProvider>
                            <Router />
                        </AuthenticationProvider>
                    </BrowserRouter>
                </LoadingContext.Provider>
            </ModalsProvider>
        </MantineProvider>
    );
};
