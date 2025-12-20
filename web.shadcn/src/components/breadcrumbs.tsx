import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBreadcrumbs } from '@/hooks/use_breadcrumbs';
import { useNavigationHistory } from '@/context/navigation_history_context';

/**
 * Breadcrumb navigation component
 *
 * Displays breadcrumb trail built from navigation history.
 * HATEOAS-compliant: all labels and hrefs from HAL _links.self
 */
export function Breadcrumbs() {
  const breadcrumbs = useBreadcrumbs();
  const navigate = useNavigate();
  const { history, truncateHistory, markNextNavigationSkip } = useNavigationHistory();

  if (breadcrumbs.length === 0) {
    return null;
  }

  const handleClick = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();

    // Find this href in the history array
    const historyIndex = history.findIndex(item => {
      const selfLink = item.resource._links?.self;
      const itemHref = Array.isArray(selfLink) ? selfLink[0]?.href : selfLink?.href;
      return itemHref === href;
    });

    if (historyIndex >= 0) {
      // Found in history - truncate to this point
      console.log('[Breadcrumb Click] Found href in history at index:', historyIndex);
      console.log('[Breadcrumb Click] Truncating from length', history.length, 'to', historyIndex + 1);
      truncateHistory(historyIndex);

      // Mark next navigation to skip tracking (avoid duplicate)
      markNextNavigationSkip();

      // Navigate
      navigate(href);
    } else {
      // Not in history (Dashboard or group) - just navigate
      console.log('[Breadcrumb Click] Href not in history, navigating to:', href);
      navigate(href);
    }
  };

  return (
    <nav aria-label="breadcrumb" className="flex items-center">
      <ol className="flex items-center flex-wrap gap-1.5">
        {breadcrumbs.map((crumb, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {crumb.isLast ? (
              // Current page - not clickable, bold
              <span className="text-sm font-medium text-foreground">
                {crumb.label}
              </span>
            ) : crumb.isGroup ? (
              // Group label - not clickable, muted
              <span className="text-sm text-muted-foreground">
                {crumb.label}
              </span>
            ) : (
              // Clickable breadcrumb
              <a
                href={crumb.href!}
                onClick={handleClick(crumb.href!)}
                className={cn(
                  'text-sm text-muted-foreground hover:text-foreground',
                  'transition-colors duration-200',
                  'focus:outline-none focus:underline'
                )}
              >
                {crumb.label}
              </a>
            )}

            {/* Separator - don't show after last item */}
            {!crumb.isLast && (
              <ChevronRight
                className="h-4 w-4 text-muted-foreground/50"
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
