import { AuthenticationContext, useAuth } from '../../Authentication';
import { useContext, useEffect, useState } from 'react';
import { LoadingContext } from '../../../context/LoadingContext';
import { User, AuthError } from '../types';

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
            await new Promise((resolve) => setTimeout(resolve, 3000));

            try {
                await auth.authorize();
            } catch (error) {
                if (!(error instanceof AuthError)) {
                    console.error('Unexpected error:', error);
                }
            } finally {
                setHasTriedAutoLogin(true);
                setIsLoading(false);
            }
        }
    }, []);

    return null;
}
