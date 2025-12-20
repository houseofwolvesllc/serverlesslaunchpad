import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { NavGroup } from '@/hooks/use_navigation';

export type NavigationSource = 'menu' | 'link' | 'browser';

export interface NavigationHistoryItem {
  resource: HalObject;
  source: NavigationSource;
  timestamp: number;
  /** Parent groups from sitemap (only when navigating via menu) */
  parentGroups?: NavGroup[];
}

interface NavigationHistoryContextValue {
  history: NavigationHistoryItem[];
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  pushResource: (resource: HalObject, source: NavigationSource, parentGroups?: NavGroup[]) => void;
  resetHistory: (initialResource: HalObject, source?: NavigationSource, parentGroups?: NavGroup[]) => void;
  popHistory: () => NavigationHistoryItem | null;
  clearHistory: () => void;
  truncateHistory: (index: number) => void;
  markNextNavigationAsMenu: () => void;
  isNextNavigationMenu: () => boolean;
  markNextNavigationSkip: () => void;
  shouldSkipNextNavigation: () => boolean;
}

const NavigationHistoryContext = createContext<NavigationHistoryContextValue | undefined>(undefined);

const MAX_HISTORY_DEPTH = 50;

interface NavigationHistoryProviderProps {
  children: React.ReactNode;
}

export function NavigationHistoryProvider({ children }: NavigationHistoryProviderProps) {
  const [history, setHistory] = useState<NavigationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const nextNavigationIsMenu = useRef(false);
  const skipNextNavigation = useRef(false);

  const pushResource = useCallback((resource: HalObject, source: NavigationSource, parentGroups?: NavGroup[]) => {
    setHistory((prev) => {
      // Helper to get href from link (handles both single link and array)
      const getHref = (link: any): string | undefined => {
        if (!link) return undefined;
        if (Array.isArray(link)) return link[0]?.href;
        return link.href;
      };

      // Check if the resource is the same as the current one (avoid duplicates)
      const currentSelfHref = getHref(prev[prev.length - 1]?.resource._links?.self);
      const newSelfHref = getHref(resource._links?.self);

      if (currentSelfHref === newSelfHref) {
        // Same resource, don't add to history
        return prev;
      }

      const newItem: NavigationHistoryItem = {
        resource,
        source,
        timestamp: Date.now(),
        parentGroups,
      };

      // Add new item and enforce max depth
      const newHistory = [...prev, newItem];
      if (newHistory.length > MAX_HISTORY_DEPTH) {
        return newHistory.slice(newHistory.length - MAX_HISTORY_DEPTH);
      }
      return newHistory;
    });
  }, []);

  const resetHistory = useCallback((initialResource: HalObject, source: NavigationSource = 'menu', parentGroups?: NavGroup[]) => {
    const newItem: NavigationHistoryItem = {
      resource: initialResource,
      source,
      timestamp: Date.now(),
      parentGroups,
    };
    setHistory([newItem]);
  }, []);

  const popHistory = useCallback((): NavigationHistoryItem | null => {
    let poppedItem: NavigationHistoryItem | null = null;
    setHistory((prev) => {
      if (prev.length <= 1) {
        return prev; // Don't pop if only one item left
      }
      poppedItem = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    return poppedItem;
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const truncateHistory = useCallback((index: number) => {
    setHistory((prev) => prev.slice(0, index + 1));
  }, []);

  const markNextNavigationAsMenu = useCallback(() => {
    console.log('[Nav History] Setting menu flag to TRUE');
    nextNavigationIsMenu.current = true;
  }, []);

  const isNextNavigationMenu = useCallback(() => {
    const wasMenu = nextNavigationIsMenu.current;
    console.log('[Nav History] Reading menu flag:', wasMenu, '(resetting to false)');
    nextNavigationIsMenu.current = false; // Reset after reading
    return wasMenu;
  }, []);

  const markNextNavigationSkip = useCallback(() => {
    skipNextNavigation.current = true;
  }, []);

  const shouldSkipNextNavigation = useCallback(() => {
    const shouldSkip = skipNextNavigation.current;
    skipNextNavigation.current = false; // Reset after reading
    return shouldSkip;
  }, []);

  const value: NavigationHistoryContextValue = {
    history,
    isLoading,
    setIsLoading,
    pushResource,
    resetHistory,
    popHistory,
    clearHistory,
    truncateHistory,
    markNextNavigationAsMenu,
    isNextNavigationMenu,
    markNextNavigationSkip,
    shouldSkipNextNavigation,
  };

  return (
    <NavigationHistoryContext.Provider value={value}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

export function useNavigationHistory(): NavigationHistoryContextValue {
  const context = useContext(NavigationHistoryContext);
  if (context === undefined) {
    throw new Error('useNavigationHistory must be used within a NavigationHistoryProvider');
  }
  return context;
}
