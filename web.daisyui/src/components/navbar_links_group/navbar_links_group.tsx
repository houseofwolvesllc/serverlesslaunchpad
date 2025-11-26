import { useState } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { logger } from '@/logging/logger';

interface LinksGroupProps {
    icon: LucideIcon;
    label: string;
    initiallyOpened?: boolean;
    link?: string;
    newTab?: boolean;
    links?: { label: string; link?: string; onClick?: (navigate: NavigateFunction) => Promise<void> }[];
}

export function LinksGroup({ icon: Icon, label, initiallyOpened, link, newTab, links }: LinksGroupProps) {
    const hasLinks = Array.isArray(links);
    const [opened, setOpened] = useState(initiallyOpened || false);
    const navigate = useNavigate();

    const items = (hasLinks ? links : []).map((link) => (
        <li key={link.label} className="list-none">
            <a
                className="text-sm pl-12 py-2 block"
                href={link.link}
                onClick={async (event) => {
                    event.preventDefault();

                    try {
                        // If there's a custom onClick handler (e.g., for POST actions), use it
                        if (link.onClick) {
                            await link.onClick(navigate);
                        }
                        // Otherwise, use React Router to navigate (for GET links)
                        else if (link.link) {
                            // Pass navigation source via location state (triggers breadcrumb reset)
                            navigate(link.link, { state: { navigationSource: 'menu' } });
                        }
                    } catch (error) {
                        // Error already handled by action handler with notifications
                        // This catch is just for safety to prevent unhandled promise rejections
                        logger.error('Navigation error', { error });
                    }
                }}
            >
                {link.label}
            </a>
        </li>
    ));

    const handleParentClick = () => {
        // If has children, toggle collapse
        if (hasLinks) {
            setOpened((o) => !o);
        }
        // If has a link but no children, navigate
        else if (link) {
            if (newTab) {
                window.open(link, '_blank', 'noopener,noreferrer');
            } else {
                // Pass navigation source via location state (triggers breadcrumb reset)
                navigate(link, { state: { navigationSource: 'menu' } });
            }
        }
    };

    return (
        <>
            <li className="list-none">
                <button
                    onClick={handleParentClick}
                    className="w-full flex items-center gap-2 font-medium text-sm py-2"
                >
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
                        <Icon className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left">{label}</span>
                    {hasLinks && (
                        <ChevronRight
                            className={cn(
                                'w-4 h-4 transition-transform duration-200',
                                opened ? '-rotate-90' : 'rotate-0'
                            )}
                            strokeWidth={1.5}
                        />
                    )}
                </button>
            </li>
            {hasLinks && opened && (
                <ul className="menu list-none">{items}</ul>
            )}
        </>
    );
}
