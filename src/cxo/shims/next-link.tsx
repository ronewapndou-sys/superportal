import { forwardRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';

/** Stand-in for next/link so the CXO pages run on React Router. */
type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; prefetch?: boolean; replace?: boolean; scroll?: boolean };

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch: _p, replace, scroll: _s, ...rest }, ref) {
  // Hash-only and external links stay plain anchors.
  if (/^(https?:|mailto:|tel:|#)/.test(href)) return <a ref={ref} href={href} {...rest} />;
  return <RouterLink ref={ref} to={href} replace={replace} {...rest} />;
});

export default Link;
