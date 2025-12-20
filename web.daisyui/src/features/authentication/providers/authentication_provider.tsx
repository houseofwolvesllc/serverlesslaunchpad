import { useContext, useEffect, useState } from 'react';
import { LoadingContext } from '../../../context/loading_context';
import { AuthenticationContext, useAuth } from '../../authentication';
import { User } from '../types';
import { logger } from '../../../logging/logger';
import { refreshCapabilities, getEntryPoint } from '../../../services/entry_point_provider';

export const AuthenticationProvider = ({ children }: { children: React.ReactNode }) => {
    const [signedInUser, setSignedInUser] = useState<User | undefined>();
    const [hasTriedAutoLogin, setHasTriedAutoLogin] = useState(false);

    const value = {
        signedInUser,
        initialized: hasTriedAutoLogin,
        setSignedInUser,
    };

    return (
        <AuthenticationContext.Provider value={value}>
            <AutoLogin setHasTriedAutoLogin={setHasTriedAutoLogin} />
            {hasTriedAutoLogin ? children : null}
        </AuthenticationContext.Provider>
    );
};

function AutoLogin({ setHasTriedAutoLogin }: { setHasTriedAutoLogin: (hasTriedAutoLogin: boolean) => void }) {
    const { setIsLoading } = useContext(LoadingContext);
    const auth = useAuth();

    useEffect(() => {
        autoLogin();

        /**
         * AutoLogin handles authentication initialization on app startup.
         *
         * Flow:
         * 1. Calls refreshCapabilities() to discover available authentication templates
         * 2. Checks for 'verify' template in entry point response
         * 3. If present (valid session): Calls verifySession() to get user details
         * 4. If absent (no/invalid session): Skips verification, user stays logged out
         *
         * This discovery-first approach prevents 401 errors during startup and follows
         * HATEOAS principles by discovering capabilities before taking actions.
         *
         * Performance:
         * - Invalid sessions: 1 API call (refreshCapabilities only)
         * - Valid sessions: 2 API calls (refreshCapabilities + verifySession)
         */
        async function autoLogin() {
            setIsLoading(true);

            try {
                // STEP 1: Discover available capabilities from entry point
                logger.debug('Refreshing capabilities to discover authentication state');
                await refreshCapabilities();

                // STEP 2: Check if verify template exists (indicates valid session)
                const entryPoint = await getEntryPoint();
                const hasVerifyTemplate = await entryPoint.hasTemplate('verify');

                if (hasVerifyTemplate) {
                    // Valid session exists - verify to get full user details
                    logger.debug('Verify template discovered, authenticating session');
                    await auth.verifySession();
                    logger.info('Session verified successfully');
                } else {
                    // No valid session - expected for new/logged-out users
                    logger.debug('No verify template found - user is unauthenticated');
                }
            } catch (error) {
                // This should only catch unexpected errors (not 401s)
                logger.error('Unexpected error during authentication startup', { error });
            } finally {
                setHasTriedAutoLogin(true);
                setIsLoading(false);
            }
        }
    }, []);

    return null;
}
