import { useContext, useEffect, useState } from 'react';
import { LoadingContext } from '../../../context/loading_context';
import { AuthenticationContext, useAuth } from '../../authentication';
import { AuthError, User } from '../types';
import { logger } from '../../../logging/logger';

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

        async function autoLogin() {
            setIsLoading(true);

            try {
                await auth.verifySession();
            } catch (error) {
                if (!(error instanceof AuthError)) {
                    logger.error('Unexpected error during session verification', { error });
                }
                // Verification failures are expected when no valid session exists
                // The user will be redirected to login by the routing logic
            } finally {
                setHasTriedAutoLogin(true);
                setIsLoading(false);
            }
        }
    }, []);

    return null;
}
