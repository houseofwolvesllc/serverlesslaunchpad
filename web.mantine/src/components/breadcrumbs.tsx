import { useNavigate } from 'react-router-dom';
import { IconChevronRight, IconHome } from '@tabler/icons-react';
import { Breadcrumbs as MantineBreadcrumbs, Anchor, Text, Group } from '@mantine/core';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs_adapter';
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

  const breadcrumbItems = breadcrumbs.map((crumb, index) => {
    if (crumb.isLast) {
      // Current page - not clickable, bold
      return (
        <Group key={index} gap={4}>
          {index === 0 && <IconHome size={16} />}
          <Text size="sm" fw={500}>
            {crumb.label}
          </Text>
        </Group>
      );
    } else if (crumb.isGroup) {
      // Group label - not clickable, muted
      return (
        <Text key={index} size="sm" c="dimmed">
          {crumb.label}
        </Text>
      );
    } else {
      // Clickable breadcrumb
      return (
        <Anchor
          key={index}
          href={crumb.href!}
          onClick={handleClick(crumb.href!)}
          size="sm"
          c="dimmed"
        >
          <Group gap={4}>
            {index === 0 && <IconHome size={16} />}
            {crumb.label}
          </Group>
        </Anchor>
      );
    }
  });

  return (
    <nav aria-label="breadcrumb">
      <MantineBreadcrumbs
        separator={<IconChevronRight size={16} stroke={1.5} />}
        separatorMargin="xs"
      >
        {breadcrumbItems}
      </MantineBreadcrumbs>
    </nav>
  );
}
