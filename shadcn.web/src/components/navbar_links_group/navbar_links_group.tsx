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
        <a
            className={cn(
                'block py-2 px-3 ml-10 text-sm font-medium text-muted-foreground no-underline border-l border-border',
                'hover:bg-accent hover:text-accent-foreground transition-colors'
            )}
            href={link.link}
            key={link.label}
            onClick={async (event) => {
                event.preventDefault();

                try {
                    // If there's a custom onClick handler (e.g., for POST actions), use it
                    if (link.onClick) {
                        await link.onClick(navigate);
                    }
                    // Otherwise, use React Router to navigate (for GET links)
                    else if (link.link) {
                        navigate(link.link);
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
                navigate(link);
            }
        }
    };

    return (
        <>
            <button
                onClick={handleParentClick}
                className={cn(
                    'w-full font-medium text-sm py-2 px-3 text-foreground',
                    'hover:bg-accent hover:text-accent-foreground transition-colors',
                    'flex items-center justify-between gap-0 rounded-md'
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
                        <Icon className="w-4 h-4" />
                    </div>
                    <span>{label}</span>
                </div>
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
            {hasLinks && (
                <div
                    className={cn(
                        'grid transition-all duration-200 ease-in-out',
                        opened ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}
                >
                    <div className="overflow-hidden">{items}</div>
                </div>
            )}
        </>
    );
}
