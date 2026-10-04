import { useEffect, useState, useCallback } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'admin' }
  | { name: 'group'; groupId: string }
  | { name: 'session'; groupId: string; sessionId: string }
  | { name: 'log'; groupId: string; dayKey: string }
  | { name: 'notFound' };

/**
 * サブパスに置かれたとき（例: /p/chat0125/）の接頭辞。末尾スラッシュなし。
 * 通常のビルドでは BASE_URL が "/" なので空文字になり、挙動は変わらない。
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** location.pathname からアプリ内のパス（BASE を除いたもの）を得る */
function appPath(pathname: string): string {
  return BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) || '/' : pathname;
}

/** グループのスラッグとして使えない予約語 */
export const RESERVED_SLUGS = ['admin', 's', 'log', 'api', 'assets', 'static'];

export function parsePath(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'admin' && parts.length === 1) return { name: 'admin' };

  if (parts.length === 1) return { name: 'group', groupId: parts[0] };
  if (parts.length === 3 && parts[1] === 's') {
    return { name: 'session', groupId: parts[0], sessionId: parts[2] };
  }
  if (parts.length === 3 && parts[1] === 'log') {
    return { name: 'log', groupId: parts[0], dayKey: parts[2] };
  }
  return { name: 'notFound' };
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parsePath(appPath(window.location.pathname)));

  useEffect(() => {
    const onPop = () => setRoute(parsePath(appPath(window.location.pathname)));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', BASE + to);
    setRoute(parsePath(to));
  }, []);

  return { route, navigate };
}

export const groupPath = (groupId: string) => `/${encodeURIComponent(groupId)}`;
export const sessionPath = (groupId: string, sessionId: string) =>
  `/${encodeURIComponent(groupId)}/s/${encodeURIComponent(sessionId)}`;
export const logPath = (groupId: string, dayKey: string) =>
  `/${encodeURIComponent(groupId)}/log/${encodeURIComponent(dayKey)}`;

interface LinkProps {
  to: string;
  navigate: (to: string) => void;
  className?: string;
  children: React.ReactNode;
}

/** pushState でページ遷移するアンカー */
export function linkProps({ to, navigate, className }: Omit<LinkProps, 'children'>) {
  return {
    href: BASE + to,
    className,
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    },
  };
}
