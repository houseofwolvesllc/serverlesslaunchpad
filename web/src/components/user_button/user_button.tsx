import { IconUser } from '@tabler/icons-react';
import { LinksGroup } from '../navbar_links_group/navbar_links_group';
import { AuthenticationContext } from '../../features/authentication';
import { useContext } from 'react';
import type { LinksGroupProps } from '../../features/sitemap/utils/transform_navigation';

interface UserButtonProps {
    /** Account navigation from sitemap (optional) */
    accountNav?: LinksGroupProps;
}

/**
 * User button component that displays account-related navigation
 *
 * If accountNav is provided from the sitemap, it will be used.
 * Otherwise, shows a simple user menu with the user's name.
 */
export function UserButton({ accountNav }: UserButtonProps) {
    const { signedInUser, initialized } = useContext(AuthenticationContext);

    if (!initialized || !signedInUser) {
        return null;
    }

    // Use sitemap account navigation if provided, otherwise fallback to simple user menu
    const userMenuData = accountNav ? {
        ...accountNav,
        initiallyOpened: true,  // Always show account links expanded
    } : {
        label: signedInUser.name || 'User Menu',
        icon: IconUser,
        initiallyOpened: true,
        // Don't include links - undefined means no dropdown/chevron will show
    };

    return <LinksGroup {...userMenuData} />;
}
