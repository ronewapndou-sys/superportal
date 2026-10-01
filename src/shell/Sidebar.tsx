import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../ui';
import icon from '../assets/mettus-icon.png';
import { NAV } from './navConfig';
import { NavIcon } from './navIcons';
import { useOrg } from './OrgContext';

export function Sidebar() {
  const toast = useToast();
  const { can } = useAuth();
  const { org } = useOrg();
  // Only show the services on this account, and only the business shown in the top bar; drop sections that end up empty.
  const sections = NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => can(i.service) && (!i.org || org === 'All organisations' || org === i.org) && (!i.hideIfCan || !can(i.hideIfCan))),
  })).filter((s) => s.items.length > 0);

  return (
    <aside className="sidebar">
      <div className="brand">
        {/* Style guide: the brand mark is always the Mettus icon PNG, never an SVG. */}
        <div className="logo">
          <img src={icon} alt="" />
        </div>
        <div>
          <div className="brand-name">Mettus Central</div>
          <div className="brand-sub">XDS · MIE</div>
        </div>
      </div>

      <nav className="nav" aria-label="Main">
        {sections.map((section) => (
          <div className="nav-section" key={section.heading}>
            <div className="nav-h">{section.heading}</div>
            {section.items.map((item) =>
              item.path ? (
                <NavLink key={item.label} to={item.path} end className={({ isActive }) => `nav-item${isActive ? ' current' : ''}`}>
                  <NavIcon name={item.icon} />
                  {item.label}
                </NavLink>
              ) : (
                <button key={item.label} type="button" className="nav-item" onClick={() => toast(`${item.label} is coming soon.`)}>
                  <NavIcon name={item.icon} />
                  {item.label}
                </button>
              ),
            )}
          </div>
        ))}
      </nav>

      <div className="version">© 2026 Mettus</div>
    </aside>
  );
}
