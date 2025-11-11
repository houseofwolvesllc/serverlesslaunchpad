import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app.tsx';

// Import shims FIRST to ensure they're applied before any AWS Amplify code runs
import './configuration/moto_amplify_shims';
import WebConfigurationStore from './configuration/web_config_store';
import { initializeEntryPoint } from './services/entry_point_provider';

async function initializeApp() {
    try {
        // Load configuration (used by entry point provider internally)
        await WebConfigurationStore.getConfig();

        // Initialize API entry point discovery (baseUrl comes from config store)
        await initializeEntryPoint();

        // Render app
        ReactDOM.createRoot(document.getElementById('root')!).render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Show error UI
        const rootElement = document.getElementById('root');
        if (rootElement) {
            rootElement.innerHTML = `
                <div style="padding: 20px; text-align: center; font-family: system-ui, sans-serif;">
                    <h1 style="color: #d32f2f;">Failed to initialize application</h1>
                    <p style="color: #666;">Please refresh the page or contact support if the problem persists.</p>
                    <details style="margin-top: 20px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
                        <summary style="cursor: pointer; color: #1976d2;">Error Details</summary>
                        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.message : 'Unknown error'}</pre>
                    </details>
                </div>
            `;
        }
    }
}

initializeApp();
