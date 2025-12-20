import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useBreadcrumbs } from '@/hooks/use_breadcrumbs_adapter';
import { useNavigationHistory } from '@houseofwolves/serverlesslaunchpad.web.commons.react';

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
      truncateHistory(historyIndex);

      // Mark next navigation to skip tracking (avoid duplicate)
      markNextNavigationSkip();

      // Navigate
      navigate(href);
    } else {
      // Not in history (Dashboard or group) - just navigate
      navigate(href);
    }
  };

  return (
    <nav aria-label="breadcrumb">
      <div className="breadcrumbs text-sm">
        <ul>
          {breadcrumbs.map((crumb, index) => (
            <li key={index}>
              {crumb.isLast ? (
                // Current page - not clickable, bold
                <span className="font-semibold text-base-content flex items-center gap-2">
                  {index === 0 && <Home className="w-4 h-4" />}
                  {crumb.label}
                </span>
              ) : crumb.isGroup ? (
                // Group label - not clickable, muted
                <span className="text-base-content/70">
                  {crumb.label}
                </span>
              ) : (
                // Clickable breadcrumb
                <a
                  href={crumb.href!}
                  onClick={handleClick(crumb.href!)}
                  className="link link-hover text-base-content/70 hover:text-base-content flex items-center gap-2"
                >
                  {index === 0 && <Home className="w-4 h-4" />}
                  {crumb.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
