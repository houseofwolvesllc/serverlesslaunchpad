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
                <div class="p-5 text-center">
                    <h1 class="text-error text-2xl font-bold mb-4">Failed to initialize application</h1>
                    <p class="opacity-70 mb-4">Please refresh the page or contact support if the problem persists.</p>
                    <details class="mt-5 text-left max-w-2xl mx-auto">
                        <summary class="cursor-pointer text-primary">Error Details</summary>
                        <pre class="bg-base-200 p-3 rounded mt-2 overflow-auto text-sm">${error instanceof Error ? error.message : 'Unknown error'}</pre>
                    </details>
                </div>
            `;
        }
    }
}

initializeApp();
