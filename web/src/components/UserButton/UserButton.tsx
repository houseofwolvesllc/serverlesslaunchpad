import { IconUser, IconLogout } from '@tabler/icons-react';
import { LinksGroup } from '../NavbarLinksGroup/NavbarLinksGroup';
import { AuthenticationContext, useAuth } from '../../features/Authentication';
import { useContext } from 'react';

export function UserButton() {
    const auth = useAuth();
    const { signedInUser, initialized } = useContext(AuthenticationContext);

    if (!initialized || !signedInUser) {
        return null;
    }

    const userMenuData = [
        {
            label: signedInUser.name || 'User Menu',
            icon: IconUser,
            initiallyOpened: false,
            links: [
                { label: 'Profile', icon: IconUser, link: '/profile' },
                { label: 'Logout', icon: IconLogout, link: '#', onClick: async () => await auth.signOut() },
            ],
        },
    ];

    const userLinks = userMenuData.map((item) => <LinksGroup {...item} key={item.label} />);

    return userLinks;
}
