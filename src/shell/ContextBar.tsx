import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/icons';
import { Popover } from '@/components/ui/overlay';
import { setBranch } from '@/lib/branch';
import { SUITE_BY_ID } from '@/lib/suites';
import { useAccess } from '@/lib/use-access';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../ui';
import { useOrg } from './OrgContext';

const orgKey = (o: string) => (o === 'XDS' ? 'xds' : o === 'MIE' ? 'mie' : 'all');

/** XDS / MIE as a segmented control: the active company is filled in its own colour, so it is obvious which one you are in. */
function CompanySwitch() {
  const { org, setOrg, options } = useOrg();
  const toast = useToast();

  if (options.length < 2) {
    return <span className="company-static" data-org={orgKey(org)}>{org}</span>;
  }
  return (
    <div className="company-switch" role="radiogroup" aria-label="Company">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === org}
          data-org={orgKey(o)}
          onClick={() => {
            if (o === org) return;
            setOrg(o);
            toast(o === 'All organisations' ? 'Showing all organisations.' : `Switched to ${o}.`);
          }}
        >
          {o === 'All organisations' ? 'All' : o}
        </button>
      ))}
    </div>
  );
}

/** Names the division you are working in, and lets you change it if you work in more than one. */
function DivisionSwitch() {
  const { branch, myBranches, roleAt, access } = useAccess();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // finance and other company-wide roles have no divisions of their own
  if (!branch) {
    return (
      <span className="division-btn static" title="You work across the whole company">
        <span className="k">Division</span>
        <span className="v">All divisions</span>
      </span>
    );
  }
  if (myBranches.length <= 1) {
    return (
      <span className="division-btn static" title="Your division">
        <span className="k">Division</span>
        <span className="v">{branch.name}</span>
      </span>
    );
  }

  return (
    <div ref={ref} className="division">
      <button type="button" className="division-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={`Division: ${branch.name}. Change division`} onClick={() => setOpen((o) => !o)}>
        <span className="k">Division</span>
        <span className="v">{branch.name}</span>
        <Icon.ChevronDown className="h-4 w-4 shrink-0 text-muted" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} align="left" className="w-80 max-w-[calc(100vw-2rem)] p-2">
        <p className="px-3 pt-2 pb-2 text-xs text-muted">Choose the division you&apos;re working in. Products change to match its access.</p>
        <ul role="listbox" aria-label="Your divisions">
          {myBranches.map((b) => {
            const active = b.id === branch.id;
            const products = access[b.id] ?? [];
            return (
              <li key={b.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setBranch(b.id);
                    setOpen(false);
                  }}
                  className={`flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${active ? 'bg-brand/[0.08]' : 'hover:bg-ink/5'}`}
                >
                  <span className="mt-0.5 h-4 w-4 shrink-0 text-brand dark:text-kw">{active && <Icon.Check className="h-4 w-4" />}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">{b.name}</span>
                    <span className="block text-xs text-muted">
                      {b.code}. {roleAt(b.id)?.name ?? 'No role'}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {products.length
                        ? `${products.length} ${products.length === 1 ? 'product' : 'products'}: ${products
                            .slice(0, 3)
                            .map((p) => SUITE_BY_ID[p].short)
                            .join(', ')}${products.length > 3 ? ' and more' : ''}`
                        : 'No products in this division'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Popover>
    </div>
  );
}

/** Where you are working: the company, and for client users the division. Always visible in the top bar. */
export function ContextBar() {
  const { can } = useAuth();
  const staff = can('platform-health') || can('support-desk');
  return (
    <div className="ctx">
      <CompanySwitch />
      {!staff && <DivisionSwitch />}
    </div>
  );
}
