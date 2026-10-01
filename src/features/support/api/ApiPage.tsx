import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/lib/business';
import { useChat } from '../../../chat';
import { PageHeader } from '../../../shell/PageHeader';
import { Pill, copyText, useModal, useToast } from '../../../ui';
import { MIE_CONNECT, MIE_CONNECT_PRODUCTS } from '../mieConnect';
import { MIE_PRODUCT_CATALOGUE } from '../mieProductCatalogue';
import { PRODUCT_CATALOGUE } from '../productCatalogue';
import { CONNECT_PRODUCTS, XDS_CONNECT, type ConnectProduct } from '../xdsConnect';
import { INITIAL_PRODUCTS, INITIAL_PRODUCTS_MIE, INITIAL_USERS, INITIAL_USERS_MIE, tempPassword, type ApiUser, type Environment, type ProductAccess } from './data';
import '../support.css';

type Connect = typeof XDS_CONNECT;

function SecretReveal({ secret, label }: { secret: string; label: string }) {
  const toast = useToast();
  return (
    <>
      <div className="secret">
        <span className="code">{secret}</span>
        <button className="btn" type="button" onClick={() => { copyText(secret); toast(`${label} copied to your clipboard.`); }}>Copy</button>
      </div>
      <p className="note-box">Copy this now. For security, you won't be able to see it again. It must be changed at first login.</p>
    </>
  );
}

type TestState = 'idle' | 'running' | 'done';

/** Simulates authenticating against the active business's API and checking the session is still valid. */
function ConnectionTest({ connect, steps }: { connect: Connect; steps: [string, string] }) {
  const toast = useToast();
  const [env, setEnv] = useState<Environment>('UAT');
  const [state, setState] = useState<TestState>('idle');
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { setState('idle'); setProgress(0); }, [connect]);

  const run = () => {
    setState('running');
    setProgress(0);
    timers.current = [
      window.setTimeout(() => setProgress(1), 700),
      window.setTimeout(() => { setProgress(2); setState('done'); toast(`Connected to ${env}. Your ${connect.tokenNoun} is valid for ${connect.ticketHours} hours.`); }, 1400),
    ];
  };

  return (
    <div className="conn-test">
      <div className="conn-test-head">
        <select className="field" aria-label="Environment to test" value={env} onChange={(e) => { setEnv(e.target.value as Environment); setState('idle'); setProgress(0); }}>
          <option>UAT</option>
          <option>Production</option>
        </select>
        <button className="btn primary" type="button" onClick={run} disabled={state === 'running'}>
          {state === 'running' ? 'Testing…' : state === 'done' ? 'Test again' : 'Test connection'}
        </button>
      </div>
      {state !== 'idle' && (
        <ol className="conn-steps" aria-live="polite">
          {steps.map((s, i) => {
            const status = progress > i ? 'done' : state === 'running' && progress === i ? 'running' : 'waiting';
            return (
              <li key={s} className={status}>
                <span className="dot" aria-hidden="true" />
                <span className="code">{s}</span>
                <span className="muted">{status === 'done' ? (i === 0 ? `${connect.tokenNoun} received` : 'valid') : status === 'running' ? 'calling…' : 'waiting'}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Search every product by name or ID. Developers need the ID for ProductId in each call. */
function ProductLookup({ mine, catalogue, businessLabel }: { mine: number[]; catalogue: [id: number, name: string][]; businessLabel: string }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = q ? catalogue.filter(([id, name]) => String(id) === q || name.toLowerCase().includes(q)) : [];
  return (
    <section className="card" style={{ marginTop: 20 }}>
      <div className="card-head">
        <div className="card-title">
          <h2>Product ID lookup</h2>
          <span className="card-sub">Find the ProductId for any of the {catalogue.length} {businessLabel} products. You can only call the ones on your contract.</span>
        </div>
        <div className="search" style={{ width: 300 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input className="field" type="search" placeholder="Search by name or ID, for example 153" aria-label="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      {q === '' ? (
        <p className="lookup-empty">Type a product name or ID to search.</p>
      ) : matches.length === 0 ? (
        <p className="lookup-empty">No product matches "{query}". Check the spelling, or search by ID.</p>
      ) : (
        <table className="table">
          <thead><tr><th style={{ width: 130 }}>Product ID</th><th>Product</th><th className="right" style={{ width: 200 }}>On your contract</th></tr></thead>
          <tbody>
            {matches.slice(0, 12).map(([id, name]) => (
              <tr key={id}>
                <td className="code cell-main">{id}</td>
                <td>{name}</td>
                <td className="right">{mine.includes(id) ? <Pill tone="green">Yes</Pill> : <span className="muted">No</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {matches.length > 12 && <p className="lookup-more">Showing 12 of {matches.length} matches. Keep typing to narrow it down.</p>}
    </section>
  );
}

const XDS_FLOW_STEPS: [string, string] = ['Login', 'IsTicketValid'];
const MIE_FLOW_STEPS: [string, string] = ['POST /v2/sessions', 'GET /v2/sessions/current'];

export function ApiPage() {
  const toast = useToast();
  const modal = useModal();
  const chat = useChat();
  const navigate = useNavigate();
  const business = useBusiness();
  const isMie = business === 'mie';
  const connect: Connect = isMie ? MIE_CONNECT : XDS_CONNECT;
  const businessLabel = isMie ? 'MIE' : 'XDS';
  const flowProducts: ConnectProduct[] = isMie ? MIE_CONNECT_PRODUCTS : CONNECT_PRODUCTS;
  const catalogue = isMie ? MIE_PRODUCT_CATALOGUE : PRODUCT_CATALOGUE;
  const testSteps = isMie ? MIE_FLOW_STEPS : XDS_FLOW_STEPS;
  const defaultUsers = isMie ? INITIAL_USERS_MIE : INITIAL_USERS;
  const defaultProducts = isMie ? INITIAL_PRODUCTS_MIE : INITIAL_PRODUCTS;

  const [users, setUsers] = useState<ApiUser[]>(defaultUsers);
  const [products, setProducts] = useState<ProductAccess[]>(defaultProducts);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [flowId, setFlowId] = useState(flowProducts[0].id);
  const [enquiries, setEnquiries] = useState(isMie ? 418 : 3184);
  const [ticketMinutes, setTicketMinutes] = useState(connect.ticketHours * 60 - 68);

  // Switching XDS/MIE in the top bar shows that business's own users, products and call flow.
  useEffect(() => {
    setUsers(defaultUsers);
    setProducts(defaultProducts);
    setFlowId(flowProducts[0].id);
    setEnquiries(isMie ? 418 : 3184);
    setTicketMinutes(connect.ticketHours * 60 - 68);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  const flow = flowProducts.find((p) => p.id === flowId) ?? flowProducts[0];
  const bump = (id: string) => setFlash((f) => ({ ...f, [id]: (f[id] ?? 0) + 1 }));
  const setUser = (id: string, changes: Partial<ApiUser>) => { setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...changes } : u))); bump(id); };

  const resetPassword = (user: ApiUser) =>
    modal.open({
      title: `Reset password for ${user.username}?`,
      body: <p>Your system won't be able to sign in to {connect.name} with the old password. Any {connect.tokenNoun} it already has keeps working until it expires (up to {connect.ticketHours} hours).</p>,
      actions: [
        { label: 'Cancel' },
        {
          label: 'Reset password',
          kind: 'primary',
          onClick: () => {
            const pwd = tempPassword();
            setUser(user.id, { status: { tone: 'green', label: 'Active' }, locked: false });
            modal.open({ title: 'Temporary password', body: <><p>Give this to the person who manages <strong className="code">{user.username}</strong>.</p><SecretReveal secret={pwd} label="Password" /></>, actions: [{ label: 'Done', kind: 'primary' }] });
          },
        },
      ],
    });

  const unlock = (user: ApiUser) =>
    modal.open({
      title: `Unlock ${user.username}?`,
      body: <p>This user was locked after too many failed {testSteps[0]} calls. Unlock it only if you know why the logins failed, for example after fixing a stored password.</p>,
      actions: [
        { label: 'Cancel' },
        { label: 'Unlock user', kind: 'primary', onClick: () => { setUser(user.id, { status: { tone: 'green', label: 'Active' }, locked: false }); toast(`${user.username} is unlocked.`); } },
      ],
    });

  const create = () =>
    modal.open({
      title: 'Create API user',
      body: (
        <>
          <p className="muted">Your system uses this username and password to call {testSteps[0]} and get a {connect.tokenNoun}.</p>
          <div className="form-row">
            <label htmlFor="u-name">Username</label>
            <input className="field code" id="u-name" name="username" placeholder="For example, svc_reporting_prod" />
          </div>
          <div className="form-row">
            <label htmlFor="u-env">Environment</label>
            <select className="field" id="u-env" name="env"><option>UAT</option><option>Production</option></select>
          </div>
          <div className="form-row">
            <label>Products</label>
            {products.map((p, i) => (
              <label key={p.productId} className="check"><input type="checkbox" name="p" value={p.name} defaultChecked={i === 0} /> {p.name} ({p.productId})</label>
            ))}
          </div>
        </>
      ),
      actions: [
        { label: 'Cancel' },
        {
          label: 'Create user',
          kind: 'primary',
          onClick: (form, formEl) => {
            const username = String(form.get('username') ?? '').trim();
            if (!/^[a-z0-9_]{4,}$/i.test(username)) {
              const input = formEl.querySelector<HTMLInputElement>('#u-name')!;
              input.classList.add('invalid');
              input.focus();
              toast('Use at least 4 letters, numbers or underscores for the username.');
              return false;
            }
            const picked = form.getAll('p').map(String);
            if (picked.length === 0) { toast('Choose at least one product.'); return false; }
            const id = `u${Date.now()}`;
            const pwd = tempPassword();
            setUsers((us) => [{ id, username, environment: form.get('env') as Environment, products: picked.join(', '), status: { tone: 'green', label: 'Active' }, lastLogin: 'Never' }, ...us]);
            bump(id);
            modal.open({ title: 'API user created', body: <><p><strong className="code">{username}</strong> can now call {testSteps[0]}.</p><SecretReveal secret={pwd} label="Password" /></>, actions: [{ label: 'Done', kind: 'primary' }] });
          },
        },
      ],
    });

  const requestProduction = (p: ProductAccess) =>
    modal.open({
      title: `Move ${p.name} to Production`,
      body: (
        <>
          <p>{businessLabel} will be asked to enable <strong>{p.name}</strong> (ProductId <span className="code">{p.productId}</span>) in Production once your UAT calls are working.</p>
          <label className="check" style={{ marginTop: 12 }}><input type="checkbox" name="tested" defaultChecked /> Our UAT calls for this product return results</label>
        </>
      ),
      actions: [
        { label: 'Cancel' },
        { label: 'Send request', kind: 'primary', onClick: () => { setProducts((ps) => ps.map((x) => (x.productId === p.productId ? { ...x, tone: 'amber', label: 'Go-live requested' } : x))); toast(`Request sent. ${businessLabel} will confirm when ${p.name} is live.`); } },
      ],
    });

  const copy = (text: string) => { copyText(text); toast('Copied to your clipboard.'); };
  const hoursLeft = `${Math.floor(ticketMinutes / 60)}h ${String(ticketMinutes % 60).padStart(2, '0')}m`;

  return (
    <>
      <PageHeader
        title="API"
        description={`Connect your systems to ${connect.name}, manage the users that sign in, and see which products you can call.`}
        actions={
          <>
            <button className="btn" type="button" onClick={() => toast('The technical specifications are downloading.')}>Technical specs</button>
            <button className="btn primary" type="button" onClick={create}>Create API user</button>
          </>
        }
      />

      <div className="stats">
        <button type="button" className="card lift stat" onClick={() => toast(`${connect.name} Production and UAT are both running normally.`)}>
          <div className="label">{connect.name}</div>
          <div className="value"><Pill tone="green">Operational</Pill></div>
          <div className="note">Production and UAT · no incidents in 7 days</div>
        </button>
        <button type="button" className="card lift stat" title="Click to refresh" onClick={() => setEnquiries((n) => n + 1 + Math.floor(Math.random() * 12))}>
          <div className="label">{isMie ? 'Verifications today' : 'Enquiries today'}</div>
          <div className="value">{enquiries.toLocaleString('en-US')}</div>
          <div className="note">{isMie ? 'Document Verification 310 · Address Verification 108' : 'Credit Enquiry 2,410 · DOVS 774'}</div>
        </button>
        <button type="button" className="card lift stat" title="Open the activity log" onClick={() => navigate('/support/activity')}>
          <div className="label">Failed calls (24 hours)</div>
          <div className="value">{isMie ? '1.4%' : '2.1%'} <Pill tone="amber">Above normal</Pill></div>
          <div className="note">{isMie ? 'Mostly document mismatches →' : 'Mostly expired tickets →'}</div>
        </button>
        <button type="button" className="card lift stat" title={`Simulate a new ${testSteps[0]}`} onClick={() => { setTicketMinutes(connect.ticketHours * 60); toast(`New ${connect.tokenNoun} issued. It is valid for ${connect.ticketHours} hours.`); }}>
          <div className="label">Current {connect.tokenNoun} ({users[0]?.username ?? 'none'})</div>
          <div className="value tnum">{hoursLeft}</div>
          <div className="meter" aria-hidden="true"><span style={{ width: `${(ticketMinutes / (connect.ticketHours * 60)) * 100}%` }} /></div>
          <div className="note">left of {connect.ticketHours} hours · click to renew</div>
        </button>
      </div>

      <div className="two-col" style={{ marginTop: 0, marginBottom: 20 }}>
        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <h2>Connection details</h2>
              <span className="card-sub">{connect.name} is a {connect.protocol}.</span>
            </div>
          </div>
          <div className="card-body">
            <dl className="details">
              <dt>Production</dt>
              <dd><button type="button" className="copyable code" onClick={() => copy(connect.productionUrl)}>{connect.productionUrl.replace('https://', '')} <span className="hint">Copy</span></button></dd>
              <dt>UAT (testing)</dt>
              <dd><button type="button" className="copyable code" onClick={() => copy(connect.uatUrl)}>{connect.uatUrl.replace('https://', '')} <span className="hint">Copy</span></button></dd>
              <dt>Sign-in</dt>
              <dd>Call <span className="code">{testSteps[0]}</span> with an API user. The {connect.tokenNoun} it returns is valid for {connect.ticketHours} hours.</dd>
              <dt>Before each call</dt>
              <dd>Check the {connect.tokenNoun} with <span className="code">{testSteps[1]}</span>, and call <span className="code">{testSteps[0]}</span> again if it isn't valid.</dd>
              <dt>Allowed IP ranges</dt>
              <dd>3 ranges · <span className="muted">last changed 12 Sep 2026</span></dd>
            </dl>
            <ConnectionTest connect={connect} steps={testSteps} />
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <h2>How to call a product</h2>
              <span className="card-sub">Call these methods in this order.</span>
            </div>
            <select className="field" aria-label="Product" value={flowId} onChange={(e) => setFlowId(e.target.value)}>
              {flowProducts.map((p) => <option key={p.id} value={p.id}>{p.name.replace(/ \(.*\)/, '')} · {p.productId}</option>)}
            </select>
          </div>
          <div className="card-body">
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>{flow.summary}</p>
            <ol className="flow">
              {flow.steps.map((s) => (
                <li key={s.method}>
                  <div className="code flow-method">{s.method}</div>
                  <div className="flow-io"><span className="muted">Send</span> {s.sends}</div>
                  <div className="flow-io"><span className="muted">Get</span> {s.returns}</div>
                </li>
              ))}
            </ol>
            <button className="btn" type="button" style={{ marginTop: 14 }} onClick={() => chat.ask(`Explain the ${flow.name} call flow`)}>Ask the assistant about this</button>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div className="card-title">
            <h2>API users</h2>
            <span className="card-sub">The logins your systems use to call Login. Each one has its own password and products.</span>
          </div>
        </div>
        <table className="table keys">
          <thead>
            <tr><th>Username</th><th style={{ width: 120 }}>Environment</th><th style={{ width: 200 }}>Products</th><th style={{ width: 220 }}>Status</th><th style={{ width: 140 }}>Last login</th><th className="right" style={{ width: 150 }}>Action</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={`${u.id}-${flash[u.id] ?? 0}`} className={flash[u.id] ? 'flash' : undefined}>
                <td className="code cell-main">{u.username}</td>
                <td className="muted">{u.environment}</td>
                <td className="muted">{u.products}</td>
                <td><Pill tone={u.status.tone}>{u.status.label}</Pill></td>
                <td className="muted">{u.lastLogin}</td>
                <td className="right">
                  {u.locked
                    ? <button className="btn" type="button" onClick={() => unlock(u)}>Unlock</button>
                    : <button className="btn" type="button" onClick={() => resetPassword(u)}>Reset password</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <div className="card-title">
            <h2>Your products</h2>
            <span className="card-sub">The products your organisation chose during onboarding, with the ProductId to send in each call.</span>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr><th>Product</th><th style={{ width: 130 }}>Product ID</th><th style={{ width: 140 }}>Area</th><th style={{ width: 190 }}>Environments</th><th className="right" style={{ width: 190 }}>Action</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.productId}>
                <td className="cell-main">{p.name}</td>
                <td className="code">{p.productId}</td>
                <td className="muted">{p.area}</td>
                <td><Pill tone={p.tone}>{p.label}</Pill></td>
                <td className="right">
                  {p.label === 'UAT only' && <button className="btn" type="button" onClick={() => requestProduction(p)}>Request Production</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="card-foot">To add another product, your administrator can change your selection in Onboarding.</p>
      </section>

      <ProductLookup mine={products.map((p) => p.productId)} catalogue={catalogue} businessLabel={businessLabel} />
    </>
  );
}
