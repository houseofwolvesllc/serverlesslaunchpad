import { User } from 'lucide-react';
import { LinksGroup } from '../navbar_links_group/navbar_links_group';
import { AuthenticationContext } from '@/features/authentication';
import { useContext } from 'react';
import type { LinksGroupProps } from '@/features/sitemap/utils/transform_navigation';

/** Client-side link inserted after My Profile in account navigation */
const THEME_LINK = { label: 'Theme', link: '/settings' };

interface UserButtonProps {
    /** Account navigation from sitemap (optional) */
    accountNav?: LinksGroupProps;
}

/**
 * User button component that displays account-related navigation
 *
 * If accountNav is provided from the sitemap, it will be used with
 * a Theme link inserted after My Profile. Otherwise, shows a simple
 * user menu with the user's name and Theme link.
 */
export function UserButton({ accountNav }: UserButtonProps) {
    const { signedInUser, initialized } = useContext(AuthenticationContext);

    if (!initialized || !signedInUser) {
        return null;
    }

    // Use sitemap account navigation if provided, otherwise fallback to simple user menu
    const userMenuData = accountNav
        ? {
              ...accountNav,
              initiallyOpened: true, // Always show account links expanded
              links: (() => {
                  const links = [...(accountNav.links ?? [])];
                  const profileIndex = links.findIndex(l => l.label === 'My Profile');
                  if (profileIndex >= 0) {
                      links.splice(profileIndex + 1, 0, THEME_LINK);
                  } else {
                      links.push(THEME_LINK);
                  }
                  return links;
              })(),
          }
        : {
              label: signedInUser.name || 'User Menu',
              icon: User,
              initiallyOpened: true,
              links: [THEME_LINK],
          };

    return <LinksGroup {...userMenuData} />;
}
