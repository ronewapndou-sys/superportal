import { useMemo } from 'react';
import { useLocation, useNavigate, useParams as useRouterParams, useSearchParams as useRouterSearchParams } from 'react-router-dom';

/** Stand-in for next/navigation so the CXO pages run on React Router. */
export function useRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: (href: string, _opts?: { scroll?: boolean }) => navigate(href),
      replace: (href: string, _opts?: { scroll?: boolean }) => navigate(href, { replace: true }),
      back: () => navigate(-1),
      forward: () => navigate(1),
      refresh: () => {},
      prefetch: (_href: string) => {},
    }),
    [navigate],
  );
}

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  return useRouterSearchParams()[0];
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  return useRouterParams() as T;
}

export function redirect(href: string): never {
  window.location.replace(href);
  throw new Error(`Redirecting to ${href}`);
}

export function notFound(): never {
  throw new Error('Not found');
}
