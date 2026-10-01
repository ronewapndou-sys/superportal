import type { Business, SuiteId } from "./api/types";

/**
 * Products the portal fronts, grouped by Mettus group business and then by
 * category. Descriptions and features are placeholders until the XDS and MIE
 * product owners confirm them (see the Products spec note). Banner gradients
 * come from the style guide's four suite heroes (blue variations only),
 * one per category.
 */
export interface Suite {
  id: SuiteId;
  business: Business;
  category: string;
  /** full product name as clients know it */
  name: string;
  /** short label for table headers and chart legends */
  short: string;
  keyword: string;
  tagline: string;
  description: string;
  heroClass: string;
  features: string[];
  launchUrl: string;
}

export const BUSINESSES: Record<Business, { id: Business; name: string; description: string }> = {
  xds: { id: "xds", name: "XDS", description: "Credit bureau, tracing and business data" },
  mie: { id: "mie", name: "MIE", description: "Background screening, verification and assessment" },
};

/** Category order per business, and the banner gradient each category uses. */
export const CATEGORIES: Record<Business, { name: string; heroClass: string; description: string }[]> = {
  xds: [
    { name: "Consumer traces", heroClass: "hero-credit", description: "Find and confirm people, addresses, numbers and accounts." },
    { name: "Identity", heroClass: "hero-risk", description: "Confirm someone is who they say they are." },
    { name: "Enquiries", heroClass: "hero-associate", description: "Credit, business and director reports." },
    { name: "Web services", heroClass: "hero-monitor", description: "The same data, straight into your own systems." },
  ],
  mie: [
    { name: "Screening", heroClass: "hero-credit", description: "Background checks before you hire or onboard." },
    { name: "Verification", heroClass: "hero-associate", description: "Quick, single-check verifications." },
    { name: "Assessment", heroClass: "hero-monitor", description: "Test skills and fit for a role." },
    { name: "Monitoring and audit", heroClass: "hero-risk", description: "Keep watching after you hire, and prove compliance." },
  ],
};

const hero = (business: Business, category: string) =>
  CATEGORIES[business].find((c) => c.name === category)?.heroClass ?? "hero-credit";

type SuiteInput = Omit<Suite, "heroClass" | "launchUrl">;

const XDS: SuiteInput[] = [
  {
    id: "consumer_trace", business: "xds", category: "Consumer traces", name: "Consumer Trace", short: "Trace",
    keyword: "current details", tagline: "Find a consumer's current details",
    description: "Trace a consumer by ID number or name and get their latest contact, address and employment details.",
    features: ["Search by ID number, passport or name", "Latest addresses, numbers and employers", "Confidence score per detail"],
  },
  {
    id: "address_trace", business: "xds", category: "Consumer traces", name: "Consumer Address Trace", short: "Address Trace",
    keyword: "address history", tagline: "See a consumer's address history",
    description: "Current and previous residential and postal addresses, with the date each was last confirmed.",
    features: ["Current and historic addresses", "Last-seen date per address", "Links to other people at an address"],
  },
  {
    id: "telephone_trace", business: "xds", category: "Consumer traces", name: "Consumer Telephone Trace", short: "Telephone Trace",
    keyword: "right number", tagline: "Reach the right number first time",
    description: "Mobile, home and work numbers linked to a consumer, ranked by how recently they were seen.",
    features: ["Mobile, home and work numbers", "Recency ranking per number", "Reverse lookup by number"],
  },
  {
    id: "account_trace", business: "xds", category: "Consumer traces", name: "Consumer Account Trace", short: "Account Trace",
    keyword: "credit accounts", tagline: "Find a consumer's credit accounts",
    description: "Credit accounts held by a consumer, with the lender and account status.",
    features: ["Open and closed accounts", "Account status and lender", "Useful for collections and recoveries"],
  },
  {
    id: "multi_trace", business: "xds", category: "Consumer traces", name: "Multiple Consumer Trace", short: "Multiple Trace",
    keyword: "many consumers", tagline: "Trace many consumers in one go",
    description: "Upload a file of consumers and get their latest details back in a single batch.",
    features: ["Upload up to 10 000 records a file", "Results as a downloadable file", "Charged only for matches"],
  },
  {
    id: "easy_trace", business: "xds", category: "Consumer traces", name: "Consumer Easy Trace", short: "Easy Trace",
    keyword: "minimal details", tagline: "Trace with minimal details",
    description: "A lighter trace for when you only have partial details, like a name and a date of birth.",
    features: ["Works with partial details", "Likely matches ranked by score", "Lower cost per search"],
  },
  {
    id: "prescreen_trace", business: "xds", category: "Consumer traces", name: "Consumer Pre-Screen Trace", short: "Pre-Screen",
    keyword: "before you engage", tagline: "Screen consumers before you engage",
    description: "A quick pre-screen of a consumer's profile to decide whether to take an application further.",
    features: ["Fast yes or no indicators", "Screens against your own criteria", "Suitable for marketing lists"],
  },
  {
    id: "consumer_auth", business: "xds", category: "Identity", name: "Consumer Authentication", short: "Authentication",
    keyword: "really them", tagline: "Check it's really them",
    description: "Ask questions only the real consumer can answer, drawn from bureau data, before you proceed.",
    features: ["Knowledge-based questions from bureau data", "Pass or fail with a score", "Works over the phone or online"],
  },
  {
    id: "id_verification", business: "xds", category: "Identity", name: "Identity Verification Trace", short: "ID Verification",
    keyword: "ID number", tagline: "Verify an ID number in seconds",
    description: "Confirm an ID number is valid and matches the person, including deceased status.",
    features: ["ID number validation", "Name and date of birth match", "Deceased and marital status"],
  },
  {
    id: "credit_enquiry", business: "xds", category: "Enquiries", name: "Consumer Credit Enquiry", short: "Credit Enquiry",
    keyword: "credit decisions", tagline: "Make faster, fairer credit decisions",
    description: "A full consumer credit report with score, accounts, judgements and payment behaviour.",
    features: ["Credit score and risk grade", "Accounts, judgements and defaults", "Payment behaviour over 24 months"],
  },
  {
    id: "business_enquiry", business: "xds", category: "Enquiries", name: "Business Enquiry", short: "Business Enquiry",
    keyword: "a company", tagline: "Know who you're dealing with in a company",
    description: "Company registration, status, directors, judgements and trading history in one report.",
    features: ["Registration and status", "Judgements and defaults", "Trading and payment history"],
  },
  {
    id: "director_enquiry", business: "xds", category: "Enquiries", name: "Director Enquiry", short: "Director Enquiry",
    keyword: "directorships", tagline: "See every directorship a person holds",
    description: "Current and past directorships for a person, with each company's status.",
    features: ["Current and past directorships", "Company status for each", "Links between directors"],
  },
  {
    id: "trace_ws", business: "xds", category: "Web services", name: "Consumer Trace Web Service", short: "Trace API",
    keyword: "your own systems", tagline: "Consumer Trace inside your own systems",
    description: "Consumer Trace as a web service, so your systems can trace consumers without anyone logging in.",
    features: ["REST and SOAP endpoints", "Same data as Consumer Trace", "API keys managed by your admins"],
  },
  {
    id: "address_trace_ws", business: "xds", category: "Web services", name: "Consumer Address Trace Web Service", short: "Address Trace API",
    keyword: "your own systems", tagline: "Address Trace inside your own systems",
    description: "Consumer Address Trace as a web service, for automated address checks at scale.",
    features: ["REST and SOAP endpoints", "Same data as Address Trace", "Usage reported per API key"],
  },
];

const MIE: SuiteInput[] = [
  {
    id: "talent", business: "mie", category: "Screening", name: "Criminal Record Checks", short: "Criminal Record Checks",
    keyword: "criminal record", tagline: "Verify a candidate's criminal record status",
    description: "Using Automated Fingerprint Identification System (AFIS) technology, verify whether a candidate has a criminal record on file.",
    features: ["AFIS fingerprint matching", "Fingerprints captured at a Fingerprint Zone or walk-in location", "A clear result, or a disclosed record"],
  },
  {
    id: "social_screening", business: "mie", category: "Screening", name: "Social Media Screening", short: "Social Media Screening",
    keyword: "online behaviour", tagline: "See a candidate's public online behaviour",
    description: "Screens a candidate's public social media for current and past conduct that could put your organisation at risk.",
    features: ["Public profiles only, with consent", "Flags by risk category", "Report suitable for HR files"],
  },
  {
    id: "swift", business: "mie", category: "Verification", name: "Qualification Verification", short: "Qualification Verification",
    keyword: "qualifications", tagline: "Confirm a candidate's qualifications",
    description: "Verify a candidate's qualifications against the National Qualifications Register (NQR), which MIE has owned and operated since 2001.",
    features: ["Checked against the National Qualifications Register (NQR)", "South African and international institutions", "Employment history confirmation"],
  },
  {
    id: "skills_assessment", business: "mie", category: "Assessment", name: "Talent Assessment Solutions", short: "Talent Assessment",
    keyword: "right fit", tagline: "Confirm a candidate is the right fit",
    description: "Scalable psychometric assessments that measure a candidate's cognitive ability, competencies and fit for the role.",
    features: ["Assessments by role family", "Candidates complete them online", "Scored results you can compare"],
  },
  {
    id: "riskguard", business: "mie", category: "Monitoring and audit", name: "Employee Risk Management", short: "Risk Management",
    keyword: "workforce risk", tagline: "Manage risk across your workforce",
    description: "Ongoing risk assessment for your workforce, including fraud listing checks and industry employment history, to catch what a once-off check can miss.",
    features: ["Fraud listing checks against the SAFPS register", "Industry employment history checks", "Ongoing monitoring, not just at hire"],
  },
  {
    id: "auditing_tool", business: "mie", category: "Monitoring and audit", name: "Specialised Screening Capabilities", short: "Specialised Screening",
    keyword: "compliance checks", tagline: "Specialised checks for regulatory compliance",
    description: "Know Your Customer, Know Your Employee and lifestyle audit checks, for roles that need more than a standard background check.",
    features: ["Know Your Customer (KYC) and Know Your Employee (KYE) checks", "Lifestyle and conflict-of-interest audits", "World-Check screening for PEPs and sanctions"],
  },
];

const slug = (id: string) => id.replace(/_/g, "-");

export const SUITES: Suite[] = [...XDS, ...MIE].map((s) => ({
  ...s,
  heroClass: hero(s.business, s.category),
  launchUrl: `https://${slug(s.id)}.${s.business}.example`,
}));

export const SUITE_BY_ID = Object.fromEntries(SUITES.map((s) => [s.id, s])) as Record<SuiteId, Suite>;
export const SUITE_IDS = SUITES.map((s) => s.id);

export const suitesFor = (business: Business) => SUITES.filter((s) => s.business === business);
export const suiteIdsFor = (business: Business) => suitesFor(business).map((s) => s.id);

/** Products of a business, grouped by category, in catalogue order. */
export function suitesByCategory(business: Business) {
  return CATEGORIES[business]
    .map((c) => ({ ...c, suites: suitesFor(business).filter((s) => s.category === c.name) }))
    .filter((c) => c.suites.length > 0);
}

export const SUITE_LABEL: Record<SuiteId | "platform", string> = {
  ...(Object.fromEntries(SUITES.map((s) => [s.id, s.short])) as Record<SuiteId, string>),
  platform: "Portal",
};
