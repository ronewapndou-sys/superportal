/**
 * Inline stroked icons — currentColor, aria-hidden, solid colour only (the
 * style guide forbids gradient fills on flat icons). No icon package.
 */
type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`fill-none stroke-current stroke-[1.8] ${className ?? "h-[18px] w-[18px]"}`}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const Icon = {
  Home: (p: IconProps) => (
    <Svg {...p}><path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z" /></Svg>
  ),
  Grid: (p: IconProps) => (
    <Svg {...p}><rect x="4" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" /></Svg>
  ),
  Receipt: (p: IconProps) => (
    <Svg {...p}><path d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.5-1.5 1.5-2-1.5L6 20.5z" /><path d="M9 8.5h6M9 12h6M9 15.5h3.5" /></Svg>
  ),
  Wallet: (p: IconProps) => (
    <Svg {...p}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="4" y="8" width="16.5" height="11" rx="2.5" /><path d="M16 13.5h1.5" /></Svg>
  ),
  Support: (p: IconProps) => (
    <Svg {...p}><path d="M4.5 13v-1.5a7.5 7.5 0 0 1 15 0V13" /><rect x="3.5" y="13" width="4" height="6" rx="1.5" /><rect x="16.5" y="13" width="4" height="6" rx="1.5" /><path d="M18.5 19c0 1.5-1.5 2-4 2h-1.5" /></Svg>
  ),
  Chart: (p: IconProps) => (
    <Svg {...p}><path d="M4 20h16" /><path d="M7 16.5V11M12 16.5V6.5M17 16.5v-4" /></Svg>
  ),
  Users: (p: IconProps) => (
    <Svg {...p}><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 19.5c.8-3.3 3.3-5 6.5-5s5.7 1.7 6.5 5" /><path d="M15.5 5.3a3.5 3.5 0 0 1 0 6.4M17.5 14.8c2 .6 3.4 2.2 4 4.7" /></Svg>
  ),
  Bell: (p: IconProps) => (
    <Svg {...p}><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></Svg>
  ),
  ChevronDown: (p: IconProps) => <Svg {...p}><path d="m6.5 9.5 5.5 5.5 5.5-5.5" /></Svg>,
  ChevronRight: (p: IconProps) => <Svg {...p}><path d="m9.5 6.5 5.5 5.5-5.5 5.5" /></Svg>,
  ChevronLeft: (p: IconProps) => <Svg {...p}><path d="m14.5 6.5-5.5 5.5 5.5 5.5" /></Svg>,
  ArrowRight: (p: IconProps) => <Svg {...p}><path d="M4.5 12h15M13.5 6l6 6-6 6" /></Svg>,
  ArrowUp: (p: IconProps) => <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>,
  ArrowDown: (p: IconProps) => <Svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>,
  Minus: (p: IconProps) => <Svg {...p}><path d="M5 12h14" /></Svg>,
  Search: (p: IconProps) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Svg>,
  Plus: (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>,
  Download: (p: IconProps) => <Svg {...p}><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></Svg>,
  X: (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>,
  Check: (p: IconProps) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>,
  Lock: (p: IconProps) => (
    <Svg {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></Svg>
  ),
  External: (p: IconProps) => (
    <Svg {...p}><path d="M14 4.5h5.5V10M19.5 4.5 11 13" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></Svg>
  ),
  Menu: (p: IconProps) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>,
  Send: (p: IconProps) => <Svg {...p}><path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4z" /></Svg>,
  Paperclip: (p: IconProps) => (
    <Svg {...p}><path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.1-8.1a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" /></Svg>
  ),
  Sparkle: (p: IconProps) => (
    <Svg {...p}><path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7L4.5 11 10.1 9z" /><path d="M18.5 16.5v4M16.5 18.5h4" /></Svg>
  ),
  Logout: (p: IconProps) => (
    <Svg {...p}><path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" /><path d="M10 12h10M16.5 8l4 4-4 4" /></Svg>
  ),
  User: (p: IconProps) => <Svg {...p}><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20c1-3.8 3.9-5.5 7.5-5.5s6.5 1.7 7.5 5.5" /></Svg>,
  Shield: (p: IconProps) => (
    <Svg {...p}><path d="M12 3.5 19 6v5.5c0 4.4-2.9 7.7-7 9-4.1-1.3-7-4.6-7-9V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></Svg>
  ),
  Calendar: (p: IconProps) => (
    <Svg {...p}><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M8 3.5v4M16 3.5v4M4 10.5h16" /></Svg>
  ),
  Info: (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.2" /></Svg>,
  Alert: (p: IconProps) => (
    <Svg {...p}><path d="M12 4 21 19.5H3z" /><path d="M12 10v4.5M12 17v.2" /></Svg>
  ),
  Clock: (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>,
  Card: (p: IconProps) => (
    <Svg {...p}><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h3" /></Svg>
  ),
  Bank: (p: IconProps) => (
    <Svg {...p}><path d="M3.5 9.5 12 4.5l8.5 5z" /><path d="M5.5 10v7M10 10v7M14 10v7M18.5 10v7M3.5 20h17" /></Svg>
  ),
  Refresh: (p: IconProps) => (
    <Svg {...p}><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9" /><path d="M19.5 4v5h-5" /></Svg>
  ),
  Mail: (p: IconProps) => (
    <Svg {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m4 7 8 6 8-6" /></Svg>
  ),
  Phone: (p: IconProps) => (
    <Svg {...p}><path d="M5 4.5h3.5l1.5 4-2 1.5a10 10 0 0 0 6 6l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.5 1.5C10.5 20.5 3.5 13.5 3.5 6A1.5 1.5 0 0 1 5 4.5z" /></Svg>
  ),
  More: (p: IconProps) => (
    <Svg {...p}><circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" /></Svg>
  ),
  Settings: (p: IconProps) => (
    <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" /></Svg>
  ),
  File: (p: IconProps) => (
    <Svg {...p}><path d="M13.5 3.5H7A2 2 0 0 0 5 5.5v13A2 2 0 0 0 7 20.5h10a2 2 0 0 0 2-2V9z" /><path d="M13.5 3.5V9H19" /></Svg>
  ),
  Filter: (p: IconProps) => <Svg {...p}><path d="M4 5.5h16l-6 7.5v5.5l-4 1.5v-7z" /></Svg>,
  Book: (p: IconProps) => (
    <Svg {...p}><path d="M5 5.5A2 2 0 0 1 7 3.5h12v14H7a2 2 0 0 0-2 2z" /><path d="M5 19.5a2 2 0 0 0 2 1h12v-3" /></Svg>
  ),
  Key: (p: IconProps) => (
    <Svg {...p}><circle cx="8" cy="15" r="4.5" /><path d="m11.2 11.8 8.3-8.3M16.5 6.5l2.5 2.5M14 9l2 2" /></Svg>
  ),
  Microsoft: (p: IconProps) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "h-[18px] w-[18px]"} aria-hidden>
      <rect x="3" y="3" width="8.5" height="8.5" className="fill-current opacity-90" />
      <rect x="12.5" y="3" width="8.5" height="8.5" className="fill-current opacity-70" />
      <rect x="3" y="12.5" width="8.5" height="8.5" className="fill-current opacity-70" />
      <rect x="12.5" y="12.5" width="8.5" height="8.5" className="fill-current opacity-90" />
    </svg>
  ),
};
