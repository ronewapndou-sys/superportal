import { Fragment, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { XDS_CONNECT } from '../features/support/xdsConnect';
import { findNav } from '../shell/navConfig';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type Account } from './accounts';
import { useAuth } from './AuthContext';
import { loadInvitedAccounts } from './invitedAccounts';
import { ThemeToggle } from '../ui/theme';
import { CircuitTraces } from './CircuitTraces';
import '../ui/ui.css';
import './login.css';

const LOGO_SRC = '/brand/mettus-horizontal-white.png';
/** The logo file is 600 wide. Each bar and each letter of "Mettus" is cropped out of it by its x-range (midpoints of the gaps), so every piece animates on its own. */
const BARS: [number, number][] = [[0, 23], [23, 53.5], [53.5, 84.5], [84.5, 115.5], [115.5, 166]];
const LETTERS: [number, number][] = [[180, 291], [291, 368], [368, 416.5], [416.5, 466], [466, 539], [539, 600]];
const clip = ([l, r]: [number, number]) => `inset(0 ${((600 - r) / 6).toFixed(2)}% 0 ${(l / 6).toFixed(2)}%)`;
const TAGLINE: [string, boolean][] = [['Everything', false], ['XDS', false], ['and', false], ['MIE,', false], ['in', true], ['one', true], ['place.', true]];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export function LoginPage() {
  const { user, checkPassword, verifyCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  // Invited accounts are created live during the demo (see StaffOnboarding), so pick them up fresh on every visit.
  const [accounts] = useState<Account[]>(() => [...DEMO_ACCOUNTS, ...loadInvitedAccounts()]);
  const [step, setStep] = useState<'password' | 'code'>('password');
  const [saved, setSaved] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [code, setCode] = useState('');
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [alarm, setAlarm] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const bump = () => setPulse((p) => p + 1);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (error) setAlarm((a) => a + 1);
  }, [error]);

  // Only return someone to the page they were on if their account can use it (it may be the previous person's page).
  const safeFrom = (a: Account) => {
    const target = findNav(from.split('?')[0]);
    return !target || a.services.includes(target.item.service) ? from : '/';
  };

  if (user) return <Navigate to={safeFrom(user)} replace />;

  const chooseSaved = (id: string) => {
    setSaved(id);
    setError('');
    setNotice('');
    const a = accounts.find((x) => x.id === id);
    setEmail(a?.email ?? '');
    setPassword(a ? DEMO_PASSWORD : '');
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }
    setBusy(true);
    const result = await checkPassword(email, password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setAccount(result.account!);
    setCode('');
    setStep('code');
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const err = await verifyCode(account!, code, remember);
    setBusy(false);
    if (err) { setError(err); return; }
    navigate(safeFrom(account!), { replace: true });
  };

  return (
    <div className="login">
      <section className="login-hero">
        <div className="login-hero-inner">
          <div className="login-lockup">
            <div className="lm" role="img" aria-label="Mettus">
              {BARS.map((part, i) => (
                <img key={`b${i}`} className="lm-bar" style={{ clipPath: clip(part), '--i': i } as React.CSSProperties} src={LOGO_SRC} alt="" aria-hidden="true" />
              ))}
              {LETTERS.map((part, i) => (
                <img key={`l${i}`} className="lm-letter" style={{ clipPath: clip(part), '--i': i } as React.CSSProperties} src={LOGO_SRC} alt="" aria-hidden="true" />
              ))}
            </div>
            <span className="login-divider" aria-hidden="true" />
            <span className="login-product" aria-label="Central">
              {[...'Central'].map((ch, i) => (
                <span key={i} className="lc" style={{ '--i': i } as React.CSSProperties} aria-hidden="true">{ch}</span>
              ))}
            </span>
          </div>
          <h2 className="login-headline" aria-label="Everything XDS and MIE, in one place.">
            {TAGLINE.map(([word, hl], i) => (
              <Fragment key={i}>
                <span className={`tw${hl ? ' hl' : ''}`} style={{ '--i': i } as React.CSSProperties} aria-hidden="true">{word}</span>{' '}
              </Fragment>
            ))}
          </h2>
        </div>
        <CircuitTraces pulse={pulse} alarm={alarm} />
        <div className="login-partners" role="img" aria-label="MIE and XDS">
          <span className="pl pl-mie" aria-hidden="true" />
          <span className="pl-divider" aria-hidden="true" />
          <span className="pl pl-xds" aria-hidden="true" />
        </div>
      </section>

      <main className="login-main">
        <ThemeToggle className="icon-btn login-theme" />
        <div className="login-card">
          {step === 'password' ? (
            <form onSubmit={submitPassword} noValidate>
              <h1>Sign in</h1>
              <p className="login-sub">{greeting()}. Use your Mettus Central account.</p>

              {error && <p className="login-error" role="alert">{error}</p>}
              {notice && !error && <p className="login-notice" role="status">{notice}</p>}

              <div className="form-row">
                <span className="login-legend" id="saved-label">Saved accounts</span>
                <div className="accts" role="group" aria-labelledby="saved-label">
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="acct"
                      title={`${a.name}, ${a.role}`}
                      aria-pressed={saved === a.id}
                      onClick={() => { chooseSaved(a.id); bump(); }}
                    >
                      <span className="acct-avatar" aria-hidden="true">{a.initials}</span>
                      <span className="acct-text">
                        <strong>{a.name}</strong>
                        <span>{a.role.replace(/,\s*/, ' · ')}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="email">Email address</label>
                <input className="field" id="email" type="email" placeholder="Enter Email Address" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setSaved(''); bump(); }} />
              </div>
              <div className="form-row">
                <div className="label-row">
                  <label htmlFor="password">Password</label>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => { setError(''); setNotice(`Ask your organisation's administrator to reset your password, or call ${XDS_CONNECT.supportPhone}.`); }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="password">
                  <input className="field" id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setSaved(''); bump(); }} />
                  <button type="button" className="link-btn" onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <label className="check" style={{ marginTop: 12 }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Keep me signed in on this device
              </label>
              <button className="btn primary login-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>

              <div className="login-or"><span>or</span></div>
              <button
                className="btn login-sso"
                type="button"
                onClick={() => { setError(''); setNotice("Single sign-on isn't set up for your organisation yet. Ask your administrator, or sign in with your email address."); }}
              >
                Sign in with your organisation
              </button>
            </form>
          ) : (
            <form onSubmit={submitCode} noValidate>
              <h1>Check your phone</h1>
              <p className="login-sub">
                A 6-digit code was sent to the cellphone ending <strong>{account!.cellEnding}</strong>. It expires in 10 minutes.
              </p>
              {error && <p className="login-error" role="alert">{error}</p>}
              {notice && !error && <p className="login-notice" role="status">{notice}</p>}
              <div className="form-row">
                <label htmlFor="code">Verification code</label>
                <div className="code-cells">
                  {Array.from({ length: 6 }, (_, i) => (
                    <span key={i} className={`code-cell${code[i] ? ' filled' : ''}${i === code.length ? ' active' : ''}`} aria-hidden="true">
                      {code[i] ?? ''}
                    </span>
                  ))}
                  <input
                    ref={codeRef}
                    className="code-field"
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); bump(); }}
                  />
                </div>
              </div>
              <button className="btn primary login-submit" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Verify and continue'}</button>
              <div className="login-links">
                <button type="button" className="link-btn" onClick={() => { setError(''); setNotice(`A new code was sent to the cellphone ending ${account!.cellEnding}.`); }}>Send a new code</button>
                <button type="button" className="link-btn" onClick={() => { setStep('password'); setError(''); setNotice(''); }}>Use a different account</button>
              </div>
            </form>
          )}
        </div>
        <footer className="login-legal">
          <span>© 2026 Mettus</span>
          <span>Privacy</span>
          <span>Terms</span>
          <span>Help: {XDS_CONNECT.supportPhone}</span>
        </footer>
      </main>
    </div>
  );
}
