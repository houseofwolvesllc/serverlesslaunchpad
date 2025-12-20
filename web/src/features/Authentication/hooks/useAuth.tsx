import * as React from 'react';
import { AuthenticationContext } from '../../Authentication';

export const useAuth = () => {
    return React.useContext(AuthenticationContext);
};
