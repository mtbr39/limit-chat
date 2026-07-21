import { useEffect, useState, useCallback } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'admin' }
  | { name: 'group'; groupId: string }
  | { name: 'session'; groupId: string; sessionId: string }
  | { name: 'notFound' };

/** グループのスラッグとして使えない予約語 */
export const RESERVED_SLUGS = ['admin', 's', 'api', 'assets', 'static'];

export function parsePath(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'admin' && parts.length === 1) return { name: 'admin' };

  if (parts.length === 1) return { name: 'group', groupId: parts[0] };
  if (parts.length === 3 && parts[1] === 's') {
    return { name: 'session', groupId: parts[0], sessionId: parts[2] };
  }
  return { name: 'notFound' };
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parsePath(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', to);
    setRoute(parsePath(to));
  }, []);

  return { route, navigate };
}

export const groupPath = (groupId: string) => `/${encodeURIComponent(groupId)}`;
export const sessionPath = (groupId: string, sessionId: string) =>
  `/${encodeURIComponent(groupId)}/s/${encodeURIComponent(sessionId)}`;

interface LinkProps {
  to: string;
  navigate: (to: string) => void;
  className?: string;
  children: React.ReactNode;
}

/** pushState でページ遷移するアンカー */
export function linkProps({ to, navigate, className }: Omit<LinkProps, 'children'>) {
  return {
    href: to,
    className,
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    },
  };
}
