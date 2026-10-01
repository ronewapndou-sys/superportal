import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ChatProvider, ChatWidget } from '../chat';
import { FpzProvider } from '../chat/FpzContext';
import { CxoSession } from '../cxo/CxoProviders';
import { TicketsProvider } from '../tickets/TicketsContext';
import { ModalProvider, ToastProvider } from '../ui';
import { findNav } from './navConfig';
import { OrgProvider } from './OrgContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './shell.css';

/**
 * Shared portal layout: sidebar, top bar, assistant, toasts and modals.
 * Render module pages as child routes; each page starts with <PageHeader>.
 * Add ?assistant=open to any URL to start with the example chat open.
 */
export function AppShell() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const nav = findNav(pathname);
  const page = nav?.item.label ?? 'Home';
  const { user } = useAuth();

  return (
    <CxoSession key={user?.email}>
    <OrgProvider>
      <ToastProvider>
        <ModalProvider>
          <TicketsProvider>
            <FpzProvider>
              <ChatProvider startOpen={params.get('assistant') === 'open'}>
                <div className="app">
                  <Sidebar />
                  <div className="app-main">
                    <Topbar section={nav?.section.heading ?? 'Portal'} page={page} />
                    <main className="main" id="main">
                      <div className="page-enter" key={pathname}>
                        <Outlet />
                      </div>
                    </main>
                  </div>
                </div>
                <ChatWidget context={page} />
              </ChatProvider>
            </FpzProvider>
          </TicketsProvider>
        </ModalProvider>
      </ToastProvider>
    </OrgProvider>
    </CxoSession>
  );
}
