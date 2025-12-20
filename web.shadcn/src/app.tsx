import './index.css';
import { Router } from './components/router';
import { Toaster } from './components/toaster';
import { BrowserRouter } from 'react-router-dom';
import { LoadingProvider } from './context/loading_context';
import { ThemeProvider } from './components/theme_provider';
import { AuthenticationProvider } from './features/authentication/providers/authentication_provider';
import { ConfirmDeleteProvider } from './utils/confirm_delete';

export const App = () => {
    return (
        <ThemeProvider defaultTheme="light" storageKey="shadcn-ui-theme">
            <LoadingProvider>
                <BrowserRouter
                    future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true,
                    }}
                >
                    <Toaster />
                    <ConfirmDeleteProvider>
                        <AuthenticationProvider>
                            <Router />
                        </AuthenticationProvider>
                    </ConfirmDeleteProvider>
                </BrowserRouter>
            </LoadingProvider>
        </ThemeProvider>
    );
};
