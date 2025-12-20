import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { Router } from './components/router';
import { createTheme, LoadingOverlay, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { BrowserRouter } from 'react-router-dom';
import { LoadingContext } from './context/loading_context';
import { AuthenticationProvider } from './features/authentication/providers/authentication_provider';
import { useState } from 'react';

// Custom theme to match shadcn colors
// shadcn dark mode: background=#020617, border=#1e293b, muted=#1e293b
const theme = createTheme({
    colors: {
        // Override dark color palette to match shadcn's slate-based dark theme
        dark: [
            '#f8fafc', // 0 - text in dark mode (light)
            '#f1f5f9', // 1 - dimmed text
            '#e2e8f0', // 2
            '#cbd5e1', // 3
            '#1e293b', // 4 - borders (shadcn --border dark = #1e293b)
            '#1e293b', // 5 - borders hover
            '#1e293b', // 6 - muted backgrounds
            '#020617', // 7 - body background (shadcn --background dark)
            '#020617', // 8
            '#020617', // 9
        ],
    },
});

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
