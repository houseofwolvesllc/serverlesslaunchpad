import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { AuthenticationProvider } from './feature/Authentication/';
import { Router } from './components/Router';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter } from 'react-router-dom';

export const App = () => {
    return (
        <MantineProvider>
            <BrowserRouter>
                <Notifications />
                <AuthenticationProvider>
                    <Router />
                </AuthenticationProvider>
            </BrowserRouter>
        </MantineProvider>
    );
};
