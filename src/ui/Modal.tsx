import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CloseIcon } from './icons';

export type ModalAction = {
  label: string;
  kind?: 'primary' | 'danger';
  /** Receives the values of any named inputs in the body. Return false to keep the modal open. */
  onClick?: (form: FormData, formEl: HTMLFormElement) => boolean | void;
};

export type ModalOptions = {
  title: string;
  body: React.ReactNode;
  actions?: ModalAction[];
};

type ModalApi = { open: (options: ModalOptions) => void; close: () => void };

const ModalContext = createContext<ModalApi>({ open: () => {}, close: () => {} });

/** In-page dialog (the demo never uses the browser's alert/confirm). */
export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<(ModalOptions & { id: number }) | null>(null);
  const nextId = useRef(0);
  const liveId = useRef(-1);
  const formRef = useRef<HTMLFormElement>(null);

  const open = useCallback((options: ModalOptions) => {
    const id = ++nextId.current;
    liveId.current = id;
    setCurrent({ ...options, id });
  }, []);
  const close = useCallback(() => {
    liveId.current = -1;
    setCurrent(null);
  }, []);

  useEffect(() => {
    if (!current) return;
    const first = formRef.current?.querySelector<HTMLElement>('input, select, textarea');
    (first ?? formRef.current?.querySelector<HTMLElement>('.modal-foot .btn:last-child'))?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, close]);

  const run = (action: ModalAction) => {
    const formEl = formRef.current!;
    const id = liveId.current;
    const keepOpen = action.onClick?.(new FormData(formEl), formEl) === false;
    // An action may open a follow-up modal; only close if this one is still showing.
    if (!keepOpen && liveId.current === id) close();
  };

  const actions = current?.actions ?? [{ label: 'Close' }];
  const submitAction = [...actions].reverse().find((a) => a.kind === 'primary');

  return (
    <ModalContext.Provider value={{ open, close }}>
      {children}
      {current && (
        <div className="scrim" onClick={(e) => e.target === e.currentTarget && close()}>
          <form
            key={current.id}
            ref={formRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onSubmit={(e) => {
              e.preventDefault();
              if (submitAction) run(submitAction);
            }}
          >
            <div className="modal-head">
              <h2 id="modal-title">{current.title}</h2>
              <button className="icon-btn" type="button" aria-label="Close" onClick={close}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">{current.body}</div>
            <div className="modal-foot">
              {actions.map((a) => (
                <button key={a.label} type="button" className={`btn${a.kind ? ' ' + a.kind : ''}`} onClick={() => run(a)}>
                  {a.label}
                </button>
              ))}
            </div>
          </form>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}
