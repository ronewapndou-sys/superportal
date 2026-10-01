import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BUSINESSES, suitesFor, type Suite } from '@/lib/suites';
import { useAuth } from '../auth/AuthContext';
import { clearPendingInvite, loadPendingInvite } from './pendingInvite';
import { PageHeader } from '../shell/PageHeader';
import { useToast } from '../ui';
import '../features/home/home.css';

/** A handful of products from the businesses this account has, shuffled: a stand-in for a real recommendation, since a brand-new client has no usage to base one on. */
function pickRandomSuites(orgs: string[], n = 4): Suite[] {
  const pool = orgs.flatMap((o) => suitesFor(o === 'MIE' ? 'mie' : 'xds'));
  return [...pool].sort(() => Math.random() - 0.5).slice(0, n);
}

/*
 * The onboarding form for anyone without an XDS, MIE or Mettus email address (an invited supplier or
 * client). Fields follow the entity and bank details the staff dashboard captures. Nothing is sent anywhere.
 */

const ENTITY_TYPES = ['Private Company', 'Public Company', 'Close Corporation', 'Sole Proprietor', 'Partnership', 'Trust', 'Not For Profit Organisation', 'Government Entity', 'Company / Organisation: Registered Outside SA', 'Other'];
const REG_LABEL: Record<string, string> = { CIPC: 'CIPC registration number', SAID: 'South African ID number', PASSPORT: 'Passport number', TRUST: 'Trust number', FOREIGN: 'Registration number' };
const REG_HINT: Record<string, string> = { CIPC: 'For example 2026/123456/07.', SAID: '13 digits.', PASSPORT: 'As shown on the passport.', TRUST: 'For example IT1234/2020.', FOREIGN: 'As issued in the country of registration.' };
const BANKS = ['ABSA', 'Capitec', 'FNB', 'Investec', 'Nedbank', 'Standard Bank', 'TymeBank'];
const ACCOUNT_TYPES = ['Current / Cheque', 'Business', 'Savings', 'Transmission'];
const DOCS = [
  { id: 'reg', label: 'Company registration certificate', hint: 'CIPC CoR14.3 or equivalent' },
  { id: 'bank', label: 'Bank confirmation letter', hint: 'Stamped by the bank, not older than 3 months' },
  { id: 'vat', label: 'VAT registration certificate', hint: 'Only if you are VAT registered' },
];

const STEPS = ['Entity', 'Bank details', 'Contact and documents', 'Review'];

type Form = {
  entityType: string; regType: string; regNumber: string; legalName: string; tradingName: string; vat: '' | 'yes' | 'no'; vatNumber: string; country: string;
  billing: 'prepaid' | 'terms'; accType: string; bank: string; account: string; holder: string; swift: string;
  contact: string; email: string; cell: string; docs: Record<string, string>;
};

const regTypesFor = (t: string) => (t === 'Sole Proprietor' ? ['SAID', 'PASSPORT'] : t === 'Trust' ? ['TRUST'] : t.includes('Outside SA') ? ['FOREIGN'] : ['CIPC']);

/** The staff invitation wizard uses its own entity-type labels; match them onto this form's list. */
const ENTITY_TYPE_FROM_STAFF: Record<string, string> = {
  'private company': 'Private Company',
  'public company': 'Public Company',
  'close corporation': 'Close Corporation',
  'sole proprietor': 'Sole Proprietor',
  trust: 'Trust',
  partnership: 'Partnership',
  'non-profit organisation': 'Not For Profit Organisation',
  'government entity': 'Government Entity',
  'company registered outside sa': 'Company / Organisation: Registered Outside SA',
};
const mapEntityType = (staffType?: string) => (staffType && ENTITY_TYPE_FROM_STAFF[staffType.toLowerCase()]) || 'Other';

function fmtCipc(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 12);
  return d.length > 10 ? `${d.slice(0, 4)}/${d.slice(4, 10)}/${d.slice(10)}` : d.length > 4 ? `${d.slice(0, 4)}/${d.slice(4)}` : d;
}

const KEY = 'mettus-central-onboarding-draft';
export const SUBMITTED_KEY = 'mettus-central-onboarding-submitted';
function loadDraft(): { form: Form; step: number } | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function InviteeForm() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const draft = loadDraft();
  const invite = draft || !user ? null : loadPendingInvite(user.email);
  const [step, setStep] = useState(draft?.step ?? 0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [recommended] = useState(() => (user ? pickRandomSuites(user.orgs) : []));
  const [form, setForm] = useState<Form>(
    draft?.form ?? {
      entityType: mapEntityType(invite?.entityType), regType: 'CIPC', regNumber: '',
      legalName: invite?.entityName ?? '', tradingName: invite?.entityName ?? '', vat: '', vatNumber: '', country: 'South Africa',
      billing: invite?.noBankDetails ? 'prepaid' : 'terms', accType: '', bank: '', account: '', holder: '', swift: '',
      contact: invite ? `${invite.contactFirst} ${invite.contactLast}`.trim() : (user?.name ?? ''),
      email: invite?.email || (user?.email ?? ''),
      cell: invite?.mobile ?? '',
      docs: {},
    },
  );

  useEffect(() => {
    if (invite) toast(`Picked up the invitation for ${invite.entityName || 'your company'}. Check the details below.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };
  const domestic = form.country === 'South Africa';

  function validate(s: number) {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.regNumber.trim()) e.regNumber = `Enter the ${REG_LABEL[form.regType].toLowerCase()}.`;
      else if (form.regType === 'CIPC' && !/^\d{4}\/\d{6}\/\d{2}$/.test(form.regNumber)) e.regNumber = 'Use the format 2026/123456/07.';
      else if (form.regType === 'SAID' && !/^\d{13}$/.test(form.regNumber)) e.regNumber = 'An ID number has 13 digits.';
      if (!form.legalName.trim()) e.legalName = 'Enter the registered entity name.';
      if (!form.tradingName.trim()) e.tradingName = 'Enter the trading name.';
      if (!form.vat) e.vat = 'Say whether the entity is VAT registered.';
      if (form.vat === 'yes' && !/^4\d{9}$/.test(form.vatNumber)) e.vatNumber = 'A VAT number has 10 digits and starts with 4.';
    }
    if (s === 1 && form.billing === 'terms') {
      if (!form.accType) e.accType = 'Choose the account type.';
      if (!form.bank.trim()) e.bank = 'Enter the bank name.';
      if (!domestic && !form.swift.trim()) e.swift = 'Enter the SWIFT or BIC code.';
      if (!form.account.trim()) e.account = 'Enter the account number.';
      else if (domestic && !/^\d{7,16}$/.test(form.account)) e.account = 'A South African account number has 7 to 16 digits.';
      if (!form.holder.trim()) e.holder = 'Enter the account holder name.';
    }
    if (s === 2) {
      if (!form.contact.trim()) e.contact = 'Enter a contact name.';
      if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address.';
      if (!/^\+?[\d\s]{9,15}$/.test(form.cell)) e.cell = 'Enter a cellphone number, for example 082 123 4567.';
      if (!form.docs.reg) e.reg = 'Attach the registration document.';
      if (form.billing === 'terms' && !form.docs.bank) e.bank_doc = 'Attach the bank confirmation letter.';
      if (form.vat === 'yes' && !form.docs.vat) e.vat_doc = 'Attach the VAT certificate.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => {
    if (!validate(step)) return;
    setStep(step + 1);
    window.scrollTo(0, 0);
  };
  const saveDraft = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ form, step })); } catch { /* storage unavailable */ }
    toast('Draft saved. You can come back and finish later.');
  };
  const submit = () => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    if (user) clearPendingInvite(user.email);
    const ref = `ONB-${Math.floor(100000 + Math.random() * 900000)}`;
    try { localStorage.setItem(`${SUBMITTED_KEY}:${user?.id}`, JSON.stringify({ ref, legalName: form.legalName, tradingName: form.tradingName, contact: form.contact, email: form.email, at: Date.now() })); } catch { /* storage unavailable */ }
    setDone(ref);
    window.scrollTo(0, 0);
  };

  const err = (k: string) => (errors[k] ? <span className="ob-err" id={`e-${k}`}>{errors[k]}</span> : null);
  const bad = (k: string) => (errors[k] ? { 'aria-invalid': true, 'aria-describedby': `e-${k}` } : {});

  if (done) {
    return (
      <div className="ob-narrow">
        <div className="card ob-card ob-done">
          <h1>Thank you, {form.contact.split(' ')[0] || 'there'}</h1>
          <p>Your onboarding for <strong>{form.legalName}</strong> was submitted. Your reference is <strong className="code">{done}</strong>.</p>
          <p className="muted">The team will verify your bank details and documents. You'll get an email at {form.email} when it's approved, or if anything is missing.</p>
          <div className="ob-actions">
            <span className="grow" />
            <button type="button" className="btn primary" onClick={() => { completeOnboarding(); navigate('/', { replace: true }); }}>Continue to Mettus Central</button>
          </div>
        </div>

        {recommended.length > 0 && (
          <>
            <h2 className="section-title" style={{ marginTop: 28 }}>Recommended for {form.tradingName || 'you'}</h2>
            <div className="service-grid">
              {recommended.map((s) => (
                <section key={s.id} className="card service-card">
                  <div className="service-section">{BUSINESSES[s.business].name}</div>
                  <div className="cell-main">{s.name}</div>
                  <p className="cell-sub">{s.tagline}</p>
                </section>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 12 }}>Once you're in, open <Link to="/products">Products</Link> to see these and request access.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="ob-narrow">
      <PageHeader title="Welcome to Mettus Central" description="Complete your onboarding to get started. The rest of the portal opens once you submit this form. It takes about 10 minutes." />
      <ol className="ob-steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="ob-dot">{i < step ? '✓' : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      <section className="card ob-card">
        {step === 0 && (
          <>
            <h2>Entity details</h2>
            <div className="form-row">
              <label htmlFor="et">Entity type</label>
              <select id="et" className="field" value={form.entityType} onChange={(e) => { const t = e.target.value; setForm((f) => ({ ...f, entityType: t, regType: regTypesFor(t)[0], regNumber: '' })); }}>
                {ENTITY_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            {regTypesFor(form.entityType).length > 1 && (
              <div className="form-row">
                <label htmlFor="rt">Registration type</label>
                <select id="rt" className="field" value={form.regType} onChange={(e) => setForm((f) => ({ ...f, regType: e.target.value, regNumber: '' }))}>
                  {regTypesFor(form.entityType).map((k) => <option key={k} value={k}>{REG_LABEL[k]}</option>)}
                </select>
              </div>
            )}
            <div className="form-row">
              <label htmlFor="rn">{REG_LABEL[form.regType]}</label>
              <input id="rn" className="field code" value={form.regNumber} inputMode={form.regType === 'CIPC' || form.regType === 'SAID' ? 'numeric' : 'text'} onChange={(e) => set('regNumber', form.regType === 'CIPC' ? fmtCipc(e.target.value) : form.regType === 'SAID' ? e.target.value.replace(/\D/g, '').slice(0, 13) : e.target.value)} {...bad('regNumber')} />
              <span className="ob-help">{REG_HINT[form.regType]}</span>
              {err('regNumber')}
            </div>
            <div className="form-row">
              <label htmlFor="ln">Registered entity name</label>
              <input id="ln" className="field" value={form.legalName} onChange={(e) => set('legalName', e.target.value)} {...bad('legalName')} />
              {err('legalName')}
            </div>
            <div className="form-row">
              <label htmlFor="tn">Trading name</label>
              <input id="tn" className="field" value={form.tradingName} onChange={(e) => set('tradingName', e.target.value)} {...bad('tradingName')} />
              {err('tradingName')}
            </div>
            <fieldset className="ob-fieldset">
              <legend>Is the entity VAT registered?</legend>
              <label className="check"><input type="radio" name="vat" checked={form.vat === 'yes'} onChange={() => set('vat', 'yes')} /> Yes</label>
              <label className="check"><input type="radio" name="vat" checked={form.vat === 'no'} onChange={() => set('vat', 'no')} /> No</label>
              {err('vat')}
            </fieldset>
            {form.vat === 'yes' && (
              <div className="form-row">
                <label htmlFor="vn">VAT number</label>
                <input id="vn" className="field code" inputMode="numeric" value={form.vatNumber} onChange={(e) => set('vatNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} {...bad('vatNumber')} />
                <span className="ob-help">10 digits, starting with 4.</span>
                {err('vatNumber')}
              </div>
            )}
            <div className="form-row">
              <label htmlFor="co">Country</label>
              <select id="co" className="field" value={form.country} onChange={(e) => set('country', e.target.value)}>
                {['South Africa', 'Botswana', 'Kenya', 'Nigeria', 'Zimbabwe', 'United Kingdom', 'Other'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2>Bank details</h2>
            <p className="muted">These are checked with your bank before you can be paid. Make sure they match your bank confirmation letter.</p>
            <fieldset className="ob-fieldset">
              <legend>How will this entity pay?</legend>
              <label className="check"><input type="radio" name="billing" checked={form.billing === 'prepaid'} onChange={() => set('billing', 'prepaid')} /> Prepaid client: tops up a wallet, so no bank details are needed</label>
              <label className="check"><input type="radio" name="billing" checked={form.billing === 'terms'} onChange={() => set('billing', 'terms')} /> Terms client: invoiced on payment terms, so bank details are needed</label>
            </fieldset>
            {form.billing === 'terms' && (
              <>
                <div className="form-row">
                  <label htmlFor="at">Account type</label>
                  <select id="at" className="field" value={form.accType} onChange={(e) => set('accType', e.target.value)} {...bad('accType')}>
                    <option value="">Choose one</option>
                    {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  {err('accType')}
                </div>
                <div className="form-row">
                  <label htmlFor="bk">Bank name</label>
                  {domestic ? (
                    <select id="bk" className="field" value={form.bank} onChange={(e) => set('bank', e.target.value)} {...bad('bank')}>
                      <option value="">Choose your bank</option>
                      {BANKS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  ) : (
                    <input id="bk" className="field" value={form.bank} onChange={(e) => set('bank', e.target.value)} {...bad('bank')} />
                  )}
                  {err('bank')}
                </div>
                {!domestic && (
                  <div className="form-row">
                    <label htmlFor="sw">SWIFT or BIC code</label>
                    <input id="sw" className="field code" value={form.swift} onChange={(e) => set('swift', e.target.value.toUpperCase())} {...bad('swift')} />
                    {err('swift')}
                  </div>
                )}
                <div className="form-row">
                  <label htmlFor="an">{domestic ? 'Account number' : 'IBAN or account number'}</label>
                  <input id="an" className="field code" inputMode={domestic ? 'numeric' : 'text'} value={form.account} onChange={(e) => set('account', domestic ? e.target.value.replace(/\D/g, '').slice(0, 16) : e.target.value)} {...bad('account')} />
                  {err('account')}
                </div>
                <div className="form-row">
                  <label htmlFor="ah">Account holder name</label>
                  <input id="ah" className="field" value={form.holder} onChange={(e) => set('holder', e.target.value)} {...bad('holder')} />
                  <span className="ob-help">Exactly as it appears on the account.</span>
                  {err('holder')}
                </div>
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2>Contact and documents</h2>
            <div className="form-row">
              <label htmlFor="cn">Contact person</label>
              <input id="cn" className="field" value={form.contact} onChange={(e) => set('contact', e.target.value)} {...bad('contact')} />
              {err('contact')}
            </div>
            <div className="ob-two">
              <div className="form-row">
                <label htmlFor="em">Email address</label>
                <input id="em" type="email" className="field" value={form.email} onChange={(e) => set('email', e.target.value)} {...bad('email')} />
                {err('email')}
              </div>
              <div className="form-row">
                <label htmlFor="ce">Cellphone number</label>
                <input id="ce" className="field" inputMode="tel" value={form.cell} onChange={(e) => set('cell', e.target.value)} {...bad('cell')} />
                {err('cell')}
              </div>
            </div>
            <h3 className="ob-h3">Documents</h3>
            <ul className="ob-docs">
              {DOCS.filter((d) => (d.id === 'bank' ? form.billing === 'terms' : d.id === 'vat' ? form.vat === 'yes' : true)).map((d) => {
                const file = form.docs[d.id];
                const ek = d.id === 'reg' ? 'reg' : d.id === 'bank' ? 'bank_doc' : 'vat_doc';
                return (
                  <li key={d.id}>
                    <div className="grow">
                      <div className="cell-main">{d.label}</div>
                      <div className="cell-sub">{file ? file : d.hint}</div>
                      {err(ek)}
                    </div>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setForm((f) => ({ ...f, docs: file ? Object.fromEntries(Object.entries(f.docs).filter(([k]) => k !== d.id)) : { ...f.docs, [d.id]: `${d.id}-${form.legalName.split(' ')[0].toLowerCase() || 'entity'}.pdf` } }));
                        setErrors((e) => ({ ...e, [ek]: '' }));
                      }}
                    >
                      {file ? 'Remove' : 'Attach file'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Review and submit</h2>
            <p className="muted">Check everything is right. You can go back to change anything.</p>
            <dl className="ob-review">
              <dt>Entity</dt><dd>{form.legalName} ({form.tradingName})<br /><span className="muted">{form.entityType}, {REG_LABEL[form.regType]} <span className="code">{form.regNumber}</span></span></dd>
              <dt>VAT</dt><dd>{form.vat === 'yes' ? <>Registered, <span className="code">{form.vatNumber}</span></> : 'Not registered'}</dd>
              <dt>Country</dt><dd>{form.country}</dd>
              <dt>Bank</dt><dd>{form.billing === 'prepaid' ? 'Prepaid client, no bank details needed' : <>{form.bank}, {form.accType}<br /><span className="code">{form.account}</span> held by {form.holder}</>}</dd>
              <dt>Contact</dt><dd>{form.contact}<br /><span className="muted">{form.email}, {form.cell}</span></dd>
              <dt>Documents</dt><dd>{Object.values(form.docs).join(', ')}</dd>
            </dl>
            <label className="check ob-np"><input type="checkbox" id="confirm" /> I confirm these details are correct and I'm authorised to give them.</label>
          </>
        )}

        <div className="ob-actions">
          <button type="button" className="btn" onClick={saveDraft}>Save draft</button>
          <span className="grow" />
          {step > 0 && <button type="button" className="btn" onClick={() => { setStep(step - 1); window.scrollTo(0, 0); }}>Back</button>}
          {step < 3 ? (
            <button type="button" className="btn primary" onClick={next}>Continue</button>
          ) : (
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                if (!(document.getElementById('confirm') as HTMLInputElement | null)?.checked) { toast('Tick the box to confirm your details first.'); return; }
                submit();
              }}
            >
              Submit onboarding
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
