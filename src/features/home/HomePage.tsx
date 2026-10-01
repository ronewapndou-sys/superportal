import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import CxoHomePage from '../../cxo/pages/home';
import { NAV } from '../../shell/navConfig';
import { PageHeader } from '../../shell/PageHeader';
import { useOrg } from '../../shell/OrgContext';
import { useToast } from '../../ui';
import { AccessDeniedBanner, AttentionCard } from './AttentionCard';
import './home.css';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** Home for Mettus staff: what needs attention across clients, and the staff services. */
function StaffHome() {
  const { user, can } = useAuth();
  const { org } = useOrg();
  const toast = useToast();
  const sections = NAV.filter((s) => s.heading !== 'Portal')
    .map((s) => ({ ...s, items: s.items.filter((i) => can(i.service)) }))
    .filter((s) => s.items.length > 0);

  return (
    <>
      <PageHeader title={`${greeting()}, ${user?.name.split(' ')[0]}`} description={`You're signed in to ${org} as Mettus staff.`} />
      <AccessDeniedBanner />
      <h2 className="section-title">Your services</h2>
      <div className="service-grid">
        {sections.flatMap((s) =>
          s.items.map((item) => (
            <section key={item.label} className="card service-card">
              <div className="service-section">{s.heading}</div>
              <div className="cell-main">{item.label}</div>
              <p className="cell-sub">{item.description}</p>
              {item.path ? (
                <Link className="btn" to={item.path}>Open</Link>
              ) : (
                <button className="btn" type="button" onClick={() => toast(`${item.label} is coming soon.`)}>Coming soon</button>
              )}
            </section>
          )),
        )}
      </div>
      <AttentionCard />
    </>
  );
}

/** Client users get the client portal Home (wallet, spend, products, activity); Mettus staff get the staff Home. */
export function HomePage() {
  const { can } = useAuth();
  if (!can('home')) return <Navigate to="/onboarding" replace />;
  return can('platform-health') || can('support-desk') ? <StaffHome /> : <CxoHomePage />;
}
