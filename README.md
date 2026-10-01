# Mettus Super Portal wireframe

Clickable demo of the Mettus Super Portal: one sign-in for XDS and MIE services. Built so far: Home, Integration and API Support, Monitoring (for clients and for Mettus staff), and support tickets through the assistant. The other services are placeholders until their pages are added.

Everything is sample data. There is no real authentication, nothing connects to XDS, and no ticket is really logged. XDS Connect details (method names, product IDs, URLs, 5-hour tickets) follow the XDS technical specifications for Credit Enquiry and DOVS. All values shown are made up.

API products: Credit Enquiry (Product ID 15), DOVS (Product ID 194), Consumer Trace, Realtime IDV and Business Enquiry.

Built with Vite, React 19, TypeScript and React Router. Styling follows the Mettus Style Guide (2026-07-06).

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and production build into dist/
```

### Run it in Docker

For sharing the demo or testing it somewhere other than your own machine. Builds the app and serves it with nginx; MSW still mocks everything in the browser, so no backend or environment variables are needed.

```sh
docker build -t superportal .
docker run -d -p 8080:8080 --name superportal superportal   # http://localhost:8080
docker stop superportal && docker rm superportal           # when you're done
```

### Demo sign-in

| Account | Email | Sees |
| --- | --- | --- |
| Client administrator | `thandi@absa.example` | Every client service, XDS and MIE, for ABSA (an existing client with a full account history) |
| Mettus staff | `ziyaad.raymond@xds.co.za` | Mettus staff: Onboarding (invitations), Platform health, Support desk, Portal Admin, Configuration |

Password for both: `Demo@2026`. Any 6-digit verification code works. The sign-in page has buttons that fill these in.

**Showing a brand-new client onboarding:** sign in as Ziyaad, open Onboarding and "Send invitation" for a company Mettus has no history for (any name, contact and email). That creates a new saved account on the sign-in screen, with the email shown right there, no password needed beyond any 6-digit code. Sign in as that account and its onboarding form opens pre-filled from the invitation, so the demo moves straight to the parts Mettus still needs (registration number, VAT, documents) instead of retyping what staff already captured.

| URL | Page |
| --- | --- |
| `/login` | Sign-in (email and password, then a verification code) |
| `/` | Home: things that need attention, and every service on the account |
| `/support/integrations` | Integrations |
| `/support/api` | API: XDS Connect access, API users, call flows, product access |
| `/support/activity` | Activity log of XDS Connect calls |
| `/monitoring` | Client monitoring: success rate, failures, services used, alerts |
| `/monitoring/platform` | Mettus platform health: every service, incidents, clients to watch (staff only) |
| `/mie/fingerprint-zone` | MIE Fingerprint Zone: screening check status, FPZ appointment bookings and fingerprint-taking training |
| any page + `?assistant=open` | Same page with the example assistant conversation open |

In the assistant, say "log a support ticket" (or use the suggestion) to log a ticket, and "my support tickets" to see them. The Activity log details panel has a **Log a ticket** button that fills in the failed call.

For MIE, the assistant also answers "how far are my checks" (or the suggestion) with your running and recent Criminal Record Checks, Qualification Verification, Social Media Screening and Employee Risk Management batches, says "book a fingerprint appointment" to book an FPZ (Fingerprint Zone) slot for a candidate and "my FPZ bookings" to see them, and answers questions about MIE's fingerprint-taking training for your own staff. The same three things also live on their own page, **Fingerprint Zone** in the sidebar (`/mie/fingerprint-zone`): check progress, a bookings table with a **Book an appointment** dialog, and a **Request training** button that opens a pre-filled support ticket. These need an account with MIE access (the client administrator demo account has it).

MIE's product names, Fingerprint Zone and NQR terminology follow [mie.co.za](https://www.mie.co.za/); the FPZ booking flow and client data are simplified for the demo.

## Structure

```
src/
  auth/                 Sign-in: AuthProvider/useAuth, RequireAuth, LoginPage, demo accounts and services
  styles/tokens.css     Style-guide colours, radii, shadows and font as CSS variables (--mt-*)
  shell/                Shared layout: sidebar, top bar, organisation picker, PageHeader
    navConfig.ts        Sidebar sections and items for the whole portal, each tagged with a service
  ui/                   Shared building blocks: Pill, useToast, useModal, charts, icons, ui.css
  chat/                 Assistant: ChatProvider/useChat, ChatWidget, replies, support tickets, MIE check status, FPZ bookings
  features/home/        Home page (service suites)
  features/mie/         MIE Fingerprint Zone page: screening check status, FPZ bookings, training (checks.ts is shared with the assistant)
  features/support/     Integration and API support: pages, sample data, routes
    xdsConnect.ts       XDS Connect facts from the technical specs
  features/monitoring/  Client monitoring and Mettus platform health, with shared sample data
```

## Adding another module

1. Put your pages in `src/features/<module>/` and export a `RouteObject[]` from `routes.tsx`
   (see `src/features/support/routes.tsx`).
2. Spread your routes into the `AppShell` children in `src/App.tsx`. They are behind the sign-in automatically.
3. In `src/shell/navConfig.ts`, give your nav item a `path`. Its `service` controls who can see and open it.
   Add the service to the accounts in `src/auth/accounts.ts` that should have it. Mark Mettus-only items `staffOnly`.
4. Start each page with `<PageHeader title description actions />` (from `src/shell`).

Inside a page you can use:

- `useAuth()` for the signed-in user and `can(service)`
- `useOrg()` for the organisation picked in the sidebar
- `useToast()('Message')` for a short notification
- `useModal().open({ title, body, actions })` for a dialog. Named inputs in `body` reach each action's `onClick` as `FormData`. Return `false` to keep it open.
- `useChat().ask('Question')` to open the assistant with a question, or `useChat().startTicket({ subject, area, attached })` to open a filled-in ticket form. Add answers to `REPLY_RULES` in `src/chat/replies.tsx`.
- `<Pill tone="green|amber|red|grey">Word</Pill>` for statuses: coloured text in a uniform label box, always with a status word
- Charts from `src/ui`: `AreaChart`, `StackedColumns`, `Sparkline`, `BarList`, `UptimeStrip`, and `TableToggle` for a table view of any chart
- CSS classes `card`, `card-head` (`card-title`, `card-sub`), `card-body`, `table`, `tabs`/`tab`, `toolbar`, `search`, `banner`, `drawer`, `btn`, `btn primary`, `field`, and the `--mt-*` variables

Writing style: no em or en dashes in the interface, and no coloured edge strips on cards, banners or rows.

When the real identity service is ready, replace `checkPassword` and `verifyCode` in `src/auth/AuthContext.tsx`. The rest of the app only uses `useAuth()`.

## Static version

`static-wireframe/` holds the earlier stand-alone HTML pages (no build step, no sign-in). They predate the latest changes.
