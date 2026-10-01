/** 18px line icons for the sidebar, drawn in a single solid colour (style guide: no gradient icons). */
const PATHS = {
  home: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9z',
  onboarding: 'M5 21V4m0 0h11l-2 4 2 4H5',
  admin: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm10 9v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7',
  config: 'M4 7h10m4 0h2M4 17h4m4 0h8M14 5v4m-4 6v4',
  integrations: 'M9 7V3m6 4V3M7 7h10v4a5 5 0 0 1-10 0V7zm5 9v5',
  api: 'M8 8l-4 4 4 4m8-8l4 4-4 4m-3-10l-2 12',
  activity: 'M4 12h4l2-6 4 12 2-6h4',
  tickets: 'M4 5h16v11H9l-5 4V5zm4 5h8M8 13h5',
  desk: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2zm16 0a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zm-3 2v1a3 3 0 0 1-3 3h-2',
  products: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  billing: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zm3 5h6M9 12h6',
  wallet: 'M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7zm0 0V6a2 2 0 0 1 2-2h10M16 13.5h.01',
  monitoring: 'M3 12h3l3-7 4 14 3-7h5',
  platform: 'M4 5h16v5H4zM4 14h16v5H4zM8 7.5h.01M8 16.5h.01',
  insights: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  fpz: 'M12 3a9 9 0 0 1 9 9v3a4 4 0 0 1-4 4 M12 3a9 9 0 0 0-9 9v4 M7.5 7.8a6.5 6.5 0 0 1 9 5.9v2.8a3.5 3.5 0 0 1-3.5 3.5 M8 15.5v-2.3a4 4 0 0 1 8 0 M12 12.2v3.3',
} as const;

export type NavIconName = keyof typeof PATHS;

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
