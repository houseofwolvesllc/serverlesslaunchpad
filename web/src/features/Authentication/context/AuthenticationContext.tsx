import { createContext } from 'react';
import { User } from '../../Authentication';

export const AuthenticationContext = createContext<{
    signedInUser: User | undefined;
    initialized: boolean;
    setSignedInUser: (user: User | undefined) => void;
}>({
    signedInUser: undefined,
    initialized: false,
    setSignedInUser: () => {
        throw new Error('setSignedInUser not implemented');
    },
});
