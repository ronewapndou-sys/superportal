import { Link } from 'react-router-dom';
import { XDS_CONNECT } from '../features/support/xdsConnect';

/**
 * Assistant replies, matched by keyword in order. Other modules can add rules to this list.
 * XDS Connect facts come from the XDS technical specifications (see features/support/xdsConnect.ts).
 */
export const REPLY_RULES: { match: RegExp; reply: React.ReactNode }[] = [
  {
    match: /phone|contact|email (xds|support)|call (xds|you|support)/,
    reply: (
      <>
        You can call XDS on <strong>{XDS_CONNECT.supportPhone}</strong> or email <strong>{XDS_CONNECT.supportEmail}</strong>. The quickest way to get help is to
        say "log a support ticket", and I'll take the details for you.
      </>
    ),
  },
  {
    match: /call flow|how.*call|order|sequence/,
    reply: (
      <>
        Every product starts the same way:
        <ol>
          <li><span className="code">Login</span> with your API user to get a ticket (valid {XDS_CONNECT.ticketHours} hours).</li>
          <li><span className="code">IsTicketValid</span> to check it.</li>
          <li>The product's match method, e.g. <span className="code">ConnectConsumerMatch</span> with Product ID 15.</li>
          <li>The result method, e.g. <span className="code">ConnectGetResult</span>, with the EnquiryID and EnquiryResultID.</li>
        </ol>
        DOVS (194) adds <span className="code">ConnectDOVRequest</span>, which SMSes the consumer, before <span className="code">ConnectGetDOVResult</span>. The{' '}
        <Link to="/support/api">API page</Link> shows each flow.
      </>
    ),
  },
  {
    match: /ticket|expired|not valid|login|password|locked|unauthori/,
    reply: (
      <>
        XDS Connect tickets from <span className="code">Login</span> are valid for {XDS_CONNECT.ticketHours} hours. If a call fails with an invalid ticket:
        <ol>
          <li>Call <span className="code">Login</span> again for a new ticket.</li>
          <li>Check it with <span className="code">IsTicketValid</span> before you start a set of calls.</li>
          <li>If Login itself fails, the API user's password may be wrong or the user may be locked. Fix it on the <Link to="/support/api">API page</Link>.</li>
        </ol>
      </>
    ),
  },
  {
    match: /liveness|facial|face|photo|dovs|194|selfie/,
    reply: (
      <>
        For DOVS (Product ID 194), <span className="code">ConnectDOVRequest</span> SMSes the consumer a link to a facial check. <span className="code">ConnectGetDOVResult</span> then
        returns whether their photo matched their ID photo and whether the liveness test passed. If liveness fails, ask them to retry in good light, facing the camera, and send a new request.
      </>
    ),
  },
  {
    match: /no (consumer|match)|not found|match|id number|passport|input/,
    reply: (
      <>
        <span className="code">ConnectConsumerMatch</span> needs one of these to find a consumer: an ID number, a passport number, or first name + surname + date of birth together. A surname
        on its own won't match.
      </>
    ),
  },
  {
    match: /credit (enquiry|report)|product id|\b15\b|report id/,
    reply: (
      <>
        Consumer Credit Enquiry is Product ID 15 and returns Report ID 1, the Consumer Credit Report. Call <span className="code">ConnectConsumerMatch</span>, then{' '}
        <span className="code">ConnectGetResult</span> with the EnquiryID and EnquiryResultID it returns.
      </>
    ),
  },
  {
    match: /uat|test|sandbox|production|url|endpoint|soap|wsdl/,
    reply: (
      <>
        XDS Connect is a SOAP web service that returns XML.
        <br />UAT: <span className="code">{XDS_CONNECT.uatUrl.replace('https://', '')}</span>
        <br />Production: <span className="code">{XDS_CONNECT.productionUrl.replace('https://', '')}</span>
        <br />Test in UAT first. You can run a connection test on the <Link to="/support/api">API page</Link>.
      </>
    ),
  },
  {
    match: /api user|my (api )?users|show.*user/,
    reply: (
      <>
        You have 4 API users. <strong>svc_onboarding_prod</strong>'s password expires in 5 days, and <strong>svc_collections_old</strong> is locked after failed logins.{' '}
        <Link to="/support/api">Open API users</Link>
      </>
    ),
  },
  {
    match: /idv|realtime|identity verification|slow|timeout|degraded|incident/,
    reply: (
      <>
        Realtime IDV is slower than usual right now. Mettus is working on it (incident INC-2291): an upstream identity data source is responding slowly, and a fix
        should be in place by 12:00. You can follow it on the <Link to="/monitoring">Monitoring</Link> page.
      </>
    ),
  },
  {
    match: /trigger|monitor|alert|webhook|503/,
    reply: (
      <>
        Monitoring triggers send default alerts and changes for the consumers and companies you monitor. Your endpoint returned 503 Service Unavailable, so delivery is being retried for
        24 hours. Check it's running, then send a test trigger from <Link to="/support/integrations">Integrations</Link>.
      </>
    ),
  },
  {
    match: /products?|what can|enable|access|trace|business enquiry/,
    reply: (
      <>
        Your organisation calls these through the API: Consumer Credit Enquiry (ProductId 15), DOVS (194), Realtime IDV (153) and Consumer Trace (2) in Production and UAT, and
        Business Enquiry (12) in UAT only. Products are chosen during onboarding. You can look up any product's ID on the <Link to="/support/api">API page</Link>.
      </>
    ),
  },
  {
    match: /connect|integration|set ?up|install|onboard/,
    reply: (
      <>
        To connect a system: create an API user on the <Link to="/support/api">API page</Link>, make sure your server addresses are on the allowed list, and build against UAT first.
        When your UAT calls work, ask your account manager to switch you to Production.
      </>
    ),
  },
  {
    match: /training|fingerprint.*(class|course)|(class|course).*fingerprint|learn (to|how).*(fingerprint|prints)|teach.*(fingerprint|prints)/,
    reply: (
      <>
        MIE runs a fingerprint-taking course so your own HR or onboarding staff can capture compliant prints in-house, instead of sending every candidate to an FPZ branch.
        It's a half-day session, classroom plus hands-on practice, and everyone who completes it gets a certificate of competence. Say "log a support ticket" to register your
        staff, or ask me to "book a fingerprint appointment" if you'd rather send candidates to an FPZ branch instead.
      </>
    ),
  },
  { match: /success|returned/, reply: "That call succeeded, so there's nothing to fix." },
  { match: /^(hi|hello|hey)\b/, reply: 'Hi! Ask me about XDS Connect, product IDs, DOVS, UAT or failed calls, or say "log a support ticket".' },
  { match: /thank/, reply: "You're welcome. Anything else?" },
];

const FALLBACK = "I can help with the XDS Connect call flow, product IDs, DOVS, UAT and failed calls. For anything else, say \"log a support ticket\" and the support team will pick it up.";

export function replyTo(question: string): React.ReactNode {
  const q = question.toLowerCase();
  return REPLY_RULES.find((r) => r.match.test(q))?.reply ?? FALLBACK;
}
