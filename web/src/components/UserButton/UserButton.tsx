import { IconUser, IconLogout } from '@tabler/icons-react';
import { LinksGroup } from '../NavbarLinksGroup/NavbarLinksGroup';
import { useAuth } from '../../feature/Authentication';

export function UserButton() {
    const auth = useAuth();

    const userMenuData = [
        {
            label: auth.signedInUser?.name || 'User Menu',
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
